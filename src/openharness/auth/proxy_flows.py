"""OAuth flows that use the AIClient-2-API proxy sidecar.

Each provider's OAuth flow is handled by the Node.js proxy's built-in
one-page login UI at ``http://127.0.0.1:{port}/auth/{provider}``.
This module opens that page in the user's browser and polls the proxy's
status endpoint until the token has been stored.
"""

from __future__ import annotations

import logging
import platform
import subprocess
import time
import urllib.error
import urllib.request

log = logging.getLogger(__name__)

#: Supported proxy OAuth providers and their display names.
PROXY_PROVIDERS: dict[str, str] = {
    "gemini": "Gemini (via Gemini CLI spoof)",
    "grok": "Grok (via xAI web client spoof)",
    "claude": "Claude (via Kiro/Anthropic client spoof)",
    "chatgpt": "ChatGPT / Codex (via OpenAI web client spoof)",
}

#: How long (seconds) to poll the proxy before giving up.
_POLL_TIMEOUT = 300

#: Seconds between each status poll.
_POLL_INTERVAL = 2.0


def _open_browser(url: str) -> bool:
    """Try to open *url* in the default browser.

    Returns:
        True if the browser was likely launched.
    """
    try:
        plat = platform.system()
        if plat == "Darwin":
            subprocess.Popen(
                ["open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            return True
        if plat == "Windows":
            subprocess.Popen(
                ["start", "", url],
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return True
        proc = subprocess.Popen(
            ["xdg-open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        try:
            proc.wait(timeout=2)
            return proc.returncode == 0
        except subprocess.TimeoutExpired:
            return True
    except Exception:
        return False


def _poll_proxy_status(base_url: str, provider: str, timeout: float) -> bool:
    """Poll ``GET /auth/{provider}/status`` until the proxy reports success.

    Returns:
        True when the provider is authenticated, False on timeout.
    """
    status_url = f"{base_url.rstrip('/')}/auth/{provider}/status"
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(status_url, timeout=3) as resp:
                import json

                data = json.loads(resp.read().decode("utf-8"))
                if data.get("authenticated") or data.get("ready"):
                    return True
        except (urllib.error.URLError, Exception):
            pass
        time.sleep(_POLL_INTERVAL)
    return False


class ProxyOAuthFlow:
    """Browser-based OAuth flow that delegates to the AIClient-2-API proxy.

    The proxy exposes a one-page login UI for each supported provider.  This
    class ensures the sidecar is running, opens the login page in the user's
    browser, and waits until the provider confirms successful authentication.

    After success, a ``proxy:{provider}`` credential reference is stored in the
    OpenHarness credential store so the provider registry can locate the active
    proxy port at runtime.

    Usage::

        flow = ProxyOAuthFlow("gemini")
        flow.run()  # blocks until auth complete or timeout
    """

    def __init__(self, provider: str, *, poll_timeout: float = _POLL_TIMEOUT) -> None:
        if provider not in PROXY_PROVIDERS:
            raise ValueError(
                f"Unknown proxy provider {provider!r}. "
                f"Supported: {', '.join(PROXY_PROVIDERS)}"
            )
        self.provider = provider
        self.poll_timeout = poll_timeout

    def run(self) -> str:
        """Run the OAuth flow.

        Starts the proxy sidecar if needed, opens the browser login page, and
        blocks until the provider reports successful authentication.

        Returns:
            A ``proxy:{provider}`` reference string that can be stored as the
            credential value in the OpenHarness credential store.

        Raises:
            RuntimeError: When the proxy is not installed, Node.js is missing,
                          or authentication does not complete within the timeout.
        """
        from openharness.auth.storage import store_credential
        from openharness.proxy.manager import get_proxy_manager

        mgr = get_proxy_manager()
        try:
            port = mgr.ensure_running()
        except RuntimeError as exc:
            raise RuntimeError(
                f"Cannot start proxy sidecar: {exc}\n"
                "Run 'oh proxy install' to install the proxy bundle."
            ) from exc

        # The proxy's base URL is http://127.0.0.1:{port}  (not /v1 for auth pages)
        proxy_root = f"http://127.0.0.1:{port}"
        auth_url = f"{proxy_root}/auth/{self.provider}"
        api_base = f"{proxy_root}/v1"

        display_name = PROXY_PROVIDERS[self.provider]
        print(f"\nStarting OAuth for: {display_name}", flush=True)
        print(f"Opening browser: {auth_url}", flush=True)

        opened = _open_browser(auth_url)
        if not opened:
            print(
                f"Could not open browser automatically.\n"
                f"Please visit: {auth_url}",
                flush=True,
            )

        print(
            f"Waiting for you to complete the login in your browser "
            f"(timeout: {self.poll_timeout:.0f}s)…",
            flush=True,
        )

        ok = _poll_proxy_status(api_base, self.provider, self.poll_timeout)
        if not ok:
            raise RuntimeError(
                f"Authentication for {display_name} did not complete within "
                f"{self.poll_timeout:.0f} seconds. Please try again."
            )

        # Store a marker in the credential store so the provider registry can
        # recognise that this provider is authenticated via the proxy.
        credential_ref = f"proxy:{self.provider}"
        store_credential(f"proxy_oauth_{self.provider}", "status", credential_ref)
        log.debug("Stored proxy credential reference for %s", self.provider)

        print(f"{display_name} authenticated successfully via proxy.", flush=True)
        return credential_ref
