"""AIClient-2-API proxy sidecar package.

Provides a managed Node.js sidecar process that exposes an OpenAI-compatible
HTTP API powered by browser-based OAuth for Gemini, Grok, Claude (via Kiro),
and ChatGPT — enabling free-tier usage without vendor API keys.

Usage::

    from openharness.proxy.manager import get_proxy_manager

    mgr = get_proxy_manager()
    port = await mgr.ensure_running()   # starts the sidecar if needed
    base_url = f"http://127.0.0.1:{port}/v1"
"""
