"""Managed sidecar process for AIClient-2-API.

AIClient-2-API is a Node.js HTTP server that exposes an OpenAI-compatible API
backed by browser-based OAuth for Gemini, Grok, Claude (Kiro), and ChatGPT.
This module downloads, installs, and manages that server as a background
process so OpenHarness can route requests through it.

Bundle location (default):  ~/.openharness/proxy-bundle/
State file:                  ~/.openharness/proxy-state.json

State file schema::

    {
        "pid": 12345,
        "port": 3141,
        "started_at": "2026-01-01T00:00:00Z",
        "auth_token": "random-secret"
    }
"""

from __future__ import annotations

import atexit
import json
import logging
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

from openharness.config.paths import get_config_dir

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: GitHub archive URL for pinned AIClient-2-API commit (main branch tarball).
_AICLIENT_GITHUB_URL = (
    "https://github.com/justlovemaki/AIClient-2-API/archive/refs/heads/main.zip"
)

#: Subdirectory inside the archive that contains the project root.
_AICLIENT_ARCHIVE_SUBDIR = "AIClient-2-API-main"

_BUNDLE_DIR_NAME = "proxy-bundle"
_STATE_FILE_NAME = "proxy-state.json"

#: Default port range for auto-selection (uses the OS to pick a free one).
_DEFAULT_PORT = 0

#: Seconds to wait for the Node.js process to start listening.
_STARTUP_TIMEOUT = 15

#: Environment variable that overrides the bundle directory location.
_BUNDLE_DIR_ENV = "OPENHARNESS_PROXY_BUNDLE_DIR"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _bundle_dir() -> Path:
    env = os.environ.get(_BUNDLE_DIR_ENV, "").strip()
    if env:
        return Path(env)
    return get_config_dir() / _BUNDLE_DIR_NAME


def _state_path() -> Path:
    return get_config_dir() / _STATE_FILE_NAME


def _load_state() -> dict[str, Any]:
    path = _state_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _save_state(state: dict[str, Any]) -> None:
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    try:
        path.chmod(0o600)
    except OSError:
        pass


def _clear_state() -> None:
    path = _state_path()
    if path.exists():
        path.unlink(missing_ok=True)


def _find_free_port() -> int:
    """Return a free TCP port by briefly binding to port 0."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _is_pid_alive(pid: int) -> bool:
    """Return True if the process with *pid* is running."""
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError):
        return False


def _is_node_available() -> bool:
    """Return True when a ``node`` binary is found on PATH."""
    return shutil.which("node") is not None


def _is_npm_available() -> bool:
    """Return True when an ``npm`` binary is found on PATH."""
    return shutil.which("npm") is not None


def _generate_auth_token() -> str:
    """Generate a random bearer token for proxy-internal trust."""
    import secrets

    return secrets.token_hex(32)


def _wait_for_port(port: int, timeout: float = _STARTUP_TIMEOUT) -> bool:
    """Poll until the port accepts TCP connections or *timeout* elapses."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.25)
    return False


# ---------------------------------------------------------------------------
# Bundle installation
# ---------------------------------------------------------------------------


def is_bundle_installed() -> bool:
    """Return True when the proxy bundle directory is ready to run.

    A bundle is considered installed when the bundle directory exists *and*
    ``node_modules/`` is present (i.e. ``npm install`` has been run).
    """
    bundle = _bundle_dir()
    return (bundle / "node_modules").exists() and (
        (bundle / "package.json").exists()
    )


def install_bundle(*, force: bool = False) -> None:
    """Download and install the AIClient-2-API bundle.

    Downloads a ZIP archive from GitHub, extracts it into ``~/.openharness/
    proxy-bundle/``, then runs ``npm install --production`` to pull Node.js
    dependencies.

    Args:
        force: When True, re-download even if a bundle is already installed.

    Raises:
        RuntimeError: When Node.js or npm is not available, or download fails.
    """
    if not _is_node_available():
        raise RuntimeError(
            "Node.js is required for the proxy sidecar but was not found on PATH.\n"
            "Install Node.js from https://nodejs.org/ and try again."
        )
    if not _is_npm_available():
        raise RuntimeError(
            "npm is required to install the proxy bundle but was not found on PATH.\n"
            "Install Node.js (which includes npm) from https://nodejs.org/"
        )

    bundle = _bundle_dir()

    if is_bundle_installed() and not force:
        log.debug("Proxy bundle already installed at %s", bundle)
        return

    log.info("Downloading AIClient-2-API from GitHub…")
    print("Downloading AIClient-2-API proxy bundle…", flush=True)

    tmp_zip = get_config_dir() / "proxy-bundle-download.zip"
    try:
        urllib.request.urlretrieve(_AICLIENT_GITHUB_URL, tmp_zip)
    except Exception as exc:
        raise RuntimeError(f"Failed to download proxy bundle: {exc}") from exc

    # Extract into a temporary staging directory, then move into place.
    staging = get_config_dir() / "proxy-bundle-staging"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    try:
        with zipfile.ZipFile(tmp_zip) as zf:
            zf.extractall(staging)
    except Exception as exc:
        raise RuntimeError(f"Failed to extract proxy bundle: {exc}") from exc
    finally:
        tmp_zip.unlink(missing_ok=True)

    extracted = staging / _AICLIENT_ARCHIVE_SUBDIR
    if not extracted.exists():
        # Fallback: look for any subdirectory that has a package.json
        candidates = [p for p in staging.iterdir() if (p / "package.json").exists()]
        if candidates:
            extracted = candidates[0]
        else:
            shutil.rmtree(staging, ignore_errors=True)
            raise RuntimeError(
                f"Unexpected archive layout — could not find {_AICLIENT_ARCHIVE_SUBDIR}/ "
                "inside the downloaded ZIP."
            )

    if bundle.exists():
        shutil.rmtree(bundle)
    shutil.move(str(extracted), str(bundle))
    shutil.rmtree(staging, ignore_errors=True)

    log.info("Running npm install --production in %s", bundle)
    print("Running npm install --production…", flush=True)
    result = subprocess.run(
        ["npm", "install", "--production"],
        cwd=bundle,
        capture_output=False,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("npm install failed. See output above for details.")

    print(f"Proxy bundle installed at: {bundle}", flush=True)


# ---------------------------------------------------------------------------
# ProxyManager
# ---------------------------------------------------------------------------


class ProxyManager:
    """Manages the lifecycle of the AIClient-2-API sidecar process.

    The sidecar is a Node.js HTTP server that exposes an OpenAI-compatible API.
    This class handles starting, stopping, and querying the sidecar, and
    persists state (PID, port, auth token) to ``~/.openharness/proxy-state.json``
    so the process can survive across ``oh`` invocations.

    Example::

        mgr = ProxyManager()
        port = mgr.ensure_running()
        # use http://127.0.0.1:{port}/v1 as base_url
        mgr.stop()
    """

    def __init__(self) -> None:
        self._proc: subprocess.Popen[bytes] | None = None
        atexit.register(self._atexit_cleanup)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def status(self) -> dict[str, Any]:
        """Return a dict describing the current proxy state.

        Keys:
            running (bool): Whether the sidecar process is alive.
            pid (int | None): Process ID.
            port (int | None): Listening port.
            auth_token (str | None): Internal auth token.
            bundle_installed (bool): Whether the Node.js bundle is installed.
        """
        state = _load_state()
        pid = state.get("pid")
        running = bool(pid and _is_pid_alive(int(pid)))
        if not running and pid:
            _clear_state()
        return {
            "running": running,
            "pid": pid if running else None,
            "port": state.get("port") if running else None,
            "auth_token": state.get("auth_token") if running else None,
            "bundle_installed": is_bundle_installed(),
        }

    def start(self, port: int = _DEFAULT_PORT) -> int:
        """Start the proxy sidecar and return the port it is listening on.

        If the sidecar is already running its port is returned immediately.

        Args:
            port: TCP port to listen on. 0 = auto-pick a free port.

        Returns:
            The port the sidecar is listening on.

        Raises:
            RuntimeError: When the bundle is not installed, Node.js is missing,
                          or the process fails to start within the timeout.
        """
        state = _load_state()
        existing_pid = state.get("pid")
        if existing_pid and _is_pid_alive(int(existing_pid)):
            log.debug("Proxy sidecar already running (pid=%s, port=%s)", existing_pid, state.get("port"))
            return int(state["port"])

        if not _is_node_available():
            raise RuntimeError(
                "Node.js is not available. Install it from https://nodejs.org/"
            )
        if not is_bundle_installed():
            raise RuntimeError(
                "Proxy bundle is not installed. Run: oh proxy install"
            )

        if port == 0:
            port = _find_free_port()

        auth_token = _generate_auth_token()
        bundle = _bundle_dir()

        env = {**os.environ, "PORT": str(port), "PROXY_AUTH_TOKEN": auth_token}

        log.info("Starting proxy sidecar on port %s", port)
        try:
            proc = subprocess.Popen(
                ["node", "."],
                cwd=bundle,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except OSError as exc:
            raise RuntimeError(f"Failed to start proxy sidecar: {exc}") from exc

        self._proc = proc

        if not _wait_for_port(port, timeout=_STARTUP_TIMEOUT):
            proc.kill()
            raise RuntimeError(
                f"Proxy sidecar did not start listening on port {port} within "
                f"{_STARTUP_TIMEOUT}s."
            )

        import datetime

        _save_state(
            {
                "pid": proc.pid,
                "port": port,
                "auth_token": auth_token,
                "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
        )
        log.info("Proxy sidecar started (pid=%s, port=%s)", proc.pid, port)
        return port

    def stop(self) -> bool:
        """Stop the sidecar if it is running.

        Returns:
            True if the process was stopped, False if it was not running.
        """
        state = _load_state()
        pid = state.get("pid")
        if not pid:
            return False

        pid = int(pid)
        if not _is_pid_alive(pid):
            _clear_state()
            return False

        try:
            os.kill(pid, signal.SIGTERM)
            # Give up to 5 s for graceful shutdown, then SIGKILL.
            for _ in range(20):
                if not _is_pid_alive(pid):
                    break
                time.sleep(0.25)
            else:
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        except ProcessLookupError:
            pass

        _clear_state()
        if self._proc is not None:
            try:
                self._proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                pass
            self._proc = None

        log.info("Proxy sidecar stopped (pid=%s)", pid)
        return True

    def ensure_running(self) -> int:
        """Start the sidecar if it is not already running.

        Returns:
            The port the sidecar is listening on.
        """
        state = _load_state()
        existing_pid = state.get("pid")
        if existing_pid and _is_pid_alive(int(existing_pid)):
            return int(state["port"])
        return self.start()

    def get_base_url(self) -> str | None:
        """Return the proxy's OpenAI-compat base URL, or None if not running."""
        state = _load_state()
        pid = state.get("pid")
        if not pid or not _is_pid_alive(int(pid)):
            return None
        port = state.get("port")
        if not port:
            return None
        return f"http://127.0.0.1:{port}/v1"

    def get_auth_token(self) -> str | None:
        """Return the proxy's internal auth token, or None if not running."""
        state = _load_state()
        pid = state.get("pid")
        if not pid or not _is_pid_alive(int(pid)):
            return None
        return state.get("auth_token")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _atexit_cleanup(self) -> None:
        """On Python exit, stop the sidecar only if we started it this session."""
        if self._proc is not None and self._proc.poll() is None:
            log.debug("atexit: stopping proxy sidecar")
            try:
                self._proc.terminate()
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_manager: ProxyManager | None = None


def get_proxy_manager() -> ProxyManager:
    """Return the process-wide singleton :class:`ProxyManager`."""
    global _manager
    if _manager is None:
        _manager = ProxyManager()
    return _manager
