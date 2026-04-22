# BlacklistedAIProxy — SwarmForge Bundled Sidecar

This directory bundles [crazyrob425/BlacklistedAIProxy](https://github.com/crazyrob425/BlacklistedAIProxy)
as a sidecar process that SwarmForge's Tauri app spawns automatically.

## What it does

BlacklistedAIProxy is an **OpenAI-compatible reverse proxy gateway** that gives
you zero-API-key access to:

| Provider | Free via |
|---|---|
| Gemini 2.5/3.x | Google OAuth (Gemini CLI flow) |
| Claude Opus/Sonnet 4.x | Kiro OAuth (AWS SSO) |
| Antigravity Gemini | Antigravity OAuth |
| Codex / GPT-5.x | OpenAI OAuth |
| Qwen3 Coder/Max | Alibaba Cloud OAuth |
| Kimi K2, DeepSeek, GLM | iFlow OAuth token |
| Grok 4.x | X/Twitter SSO cookie |

## Setup

```bash
# From the repo root:
cd frontend/desktop/proxy

# Install dependencies
npm install

# Copy example configs
cp configs/config.json.example configs/config.json
cp configs/provider_pools.json.example configs/provider_pools.json

# Start manually (SwarmForge starts it automatically when opened)
npm start
```

## Updating

The proxy source lives at https://github.com/crazyrob425/BlacklistedAIProxy.
To update, copy the `src/` directory from the latest release into this folder.

## API Endpoints (used by SwarmForge UI)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Connectivity check |
| POST | `/api/login` | Authenticate to management UI |
| GET | `/api/providers` | List all provider pools |
| POST | `/api/providers` | Add a provider node |
| PUT | `/api/providers/{type}/{uuid}` | Update a provider node |
| DELETE | `/api/providers/{type}/{uuid}` | Remove a provider node |
| POST | `/api/providers/{type}/generate-auth-url` | Start OAuth flow |
| POST | `/api/oauth/manual-callback` | Complete OAuth callback |
| GET | `/api/config` | Get global config |
| POST | `/api/config` | Update global config |
| GET | `/api/events` | SSE stream for real-time events |
| POST | `/api/restart-service` | Restart worker process |
| GET | `/api/check-update` | Check for proxy updates |

## Port configuration

- **Worker API server**: port 3000 (default, `SERVER_PORT` in `configs/config.json`)
- **Master management**: port 3100 (default, `MASTER_PORT` env var)

## License

BlacklistedAIProxy is licensed under GPL v3.
See https://github.com/crazyrob425/BlacklistedAIProxy/blob/main/LICENSE
