<h1 align="center">
  <img src="assets/logo.png" alt="BlacklistedBots" width="80" style="vertical-align: middle;">
  <br><br>
  <code>☠ &nbsp; B L A C K L I S T E D B O T S &nbsp; ☠</code>
  <br>
  <sub><sup>by <strong>Blacklisted Binary Labs</strong></sup></sub>
</h1>

<p align="center">
  <strong>The agent harness they don't want you running.</strong><br>
  <em>Open. Unrestricted. Unapologetic. Yours.</em>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-30_sec-red?style=for-the-badge" alt="Quick Start"></a>
  <a href="#-features"><img src="https://img.shields.io/badge/Tools-43+-green?style=for-the-badge" alt="Tools"></a>
  <a href="#-architecture"><img src="https://img.shields.io/badge/Architecture-Modular-blueviolet?style=for-the-badge" alt="Architecture"></a>
  <a href="#-future-plans"><img src="https://img.shields.io/badge/Roadmap-Going_Deeper-orange?style=for-the-badge" alt="Roadmap"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-≥3.10-blue?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/React+Ink-TUI-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/pytest-114_pass-brightgreen" alt="Pytest">
  <img src="https://img.shields.io/badge/Tauri-Desktop_App-orange?logo=tauri&logoColor=white" alt="Tauri">
  <img src="https://img.shields.io/badge/MCP-Supported-9B59B6" alt="MCP">
  <a href="https://github.com/Blacklisted-Binary/BlacklistedBots/actions/workflows/ci.yml"><img src="https://github.com/Blacklisted-Binary/BlacklistedBots/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

---

> *"The best way to predict the future is to deploy it — then watch everyone else scramble to catch up."*
> — **Blacklisted Binary Labs**, probably

---

## 💀 What Is This?

**BlacklistedBots** is a **full-stack AI agent harness** — the scaffolding, plumbing, wiring, and guardrails (optional) that turn a raw LLM into something that actually *does things*.

Built by **Blacklisted Binary Labs** for builders, hackers, researchers, and people who think vendor lock-in is a personal insult.

You bring the API key. We bring the chaos — structured chaos, with Pydantic types and 114 passing tests.

**BlacklistedBots = LLM brain + 43 tools + skills engine + multi-agent coordination + permission system + terminal UI + desktop app**

It runs. It loops. It uses tools. It spawns subagents. It remembers things across sessions. It respects (or ignores) your permission rules. It ships with a React TUI, a Tauri desktop app, and a personal-agent mode called `ohmo`.

No SaaS. No subscription wall. No "upgrade to Pro" prompts. Just raw agent infrastructure that you own.

---

## ✨ What You Actually Get

<table align="center" width="100%">
<tr>
<td width="20%" align="center" style="vertical-align: top; padding: 15px;">

### 🔄 Agent Loop

Streaming tool-call cycle. Exponential backoff on API failures. Parallel tool execution. Token counting. It loops until the model says it's done — or until your rate limit says otherwise.

</td>
<td width="20%" align="center" style="vertical-align: top; padding: 15px;">

### 🔧 43+ Tools

File I/O. Shell execution. Web fetch. Web search. Jupyter notebooks. MCP protocol. Background tasks. Subagent spawning. On-demand skill loading. Cron scheduling. Remote triggers. Everything.

</td>
<td width="20%" align="center" style="vertical-align: top; padding: 15px;">

### 🧠 Memory & Context

Persistent cross-session memory. Auto-compact context compression. `CLAUDE.md` discovery and injection. Session resume. History. Your agent actually remembers what you did last Tuesday.

</td>
<td width="20%" align="center" style="vertical-align: top; padding: 15px;">

### 🛡️ Permissions

Multi-level modes: default, auto, plan. Path-level allow/deny rules. Denied command patterns. Pre/PostToolUse lifecycle hooks. Interactive approval dialogs. Lock it down or let it rip — your call.

</td>
<td width="20%" align="center" style="vertical-align: top; padding: 15px;">

### 🤝 Multi-Agent Swarm

Spawn subagents. Delegate tasks. Manage teams. Background lifecycle. If one bot isn't enough, send a squad.

</td>
</tr>
</table>

---

## 🚀 Quick Start

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/Blacklisted-Binary/BlacklistedBots/main/scripts/install.sh | bash
```

Detects your OS (Linux / macOS / WSL). Checks Python ≥ 3.10 and Node.js ≥ 18. Installs everything. Sets up config. Done.

**Options:**

| Flag | What it does |
|------|-------------|
| `--from-source` | Clone from GitHub and install editable (`pip install -e .`) |
| `--with-channels` | Also install IM channel deps (Slack, Telegram, Discord) |

```bash
# From source, with all channels
curl -fsSL https://raw.githubusercontent.com/Blacklisted-Binary/BlacklistedBots/main/scripts/install.sh | bash -s -- --from-source --with-channels
```

### Manual Install

```bash
git clone https://github.com/Blacklisted-Binary/BlacklistedBots.git
cd BlacklistedBots
uv sync --extra dev
```

### Run It

```bash
# One-shot prompt
ANTHROPIC_API_KEY=your_key uv run oh -p "Inspect this repository and tell me what's broken"

# Interactive session
uv run oh
```

### Guided Setup (Recommended for Newcomers)

```bash
uv run oh setup
```

Walks you through provider selection → authentication → model → profile. No manual YAML spelunking required.

---

## 🔌 Provider Compatibility

BlacklistedBots doesn't care who hosts your model. If it speaks Anthropic or OpenAI format, it works.

### Workflows

| Workflow | What's Behind It |
|----------|-----------------|
| **Anthropic-Compatible API** | Claude official, Kimi, GLM, MiniMax, any Anthropic-compatible gateway |
| **Claude Subscription** | Your existing `~/.claude/.credentials.json` |
| **OpenAI-Compatible API** | OpenAI, OpenRouter, DashScope, DeepSeek, SiliconFlow, Groq, Ollama, GitHub Models |
| **Codex Subscription** | Your existing `~/.codex/auth.json` |
| **GitHub Copilot** | OAuth device flow — no API key needed |

### Tested Backends

| Backend | Format | Example Models |
|---------|--------|---------------|
| Claude official | Anthropic | `claude-sonnet-4-6`, `claude-opus-4-6` |
| Moonshot / Kimi | Anthropic | `kimi-k2.5` |
| Zhipu / GLM | Anthropic-compatible | `glm-4.5` |
| OpenAI | OpenAI | `gpt-5.4`, `gpt-4.1` |
| DeepSeek | OpenAI-compatible | `deepseek-chat`, `deepseek-reasoner` |
| Groq | OpenAI-compatible | `llama-3.3-70b-versatile` |
| Ollama | OpenAI-compatible | any local model |
| GitHub Copilot | Copilot OAuth | Copilot default |

```bash
# Manage providers like an adult
oh provider list
oh provider use <profile>
oh provider add my-endpoint --label "My Thing" --provider openai --api-format openai \
  --auth-source openai_api_key --model my-model --base-url https://my.endpoint/v1
```

---

## 🏗️ Architecture

BlacklistedBots implements the **Agent Harness** pattern: the model provides intelligence; the harness provides hands, eyes, memory, and boundaries (optional).

```
src/openharness/
  engine/       # 🔄 Agent loop — query → stream → tool-call → loop
  tools/        # 🔧 43+ tools — file, shell, search, web, MCP, tasks, agents
  skills/       # 📚 On-demand knowledge — loaded from .md files
  plugins/      # 🔌 Extensions — commands, hooks, agents, MCP servers
  permissions/  # 🛡️ Safety — modes, path rules, command deny lists
  hooks/        # ⚡ Lifecycle — PreToolUse / PostToolUse events
  commands/     # 💬 54 slash commands — /help, /commit, /plan, /resume, ...
  mcp/          # 🌐 Model Context Protocol client
  memory/       # 🧠 Persistent cross-session memory
  tasks/        # 📋 Background task management
  coordinator/  # 🤝 Multi-agent — subagent spawning, team coordination
  prompts/      # 📝 Context assembly — system prompt, CLAUDE.md, skills
  config/       # ⚙️ Settings — multi-layer config, migrations
  ui/           # 🖥️ React TUI + Tauri desktop app
```

### The Loop

```python
while True:
    response = await api.stream(messages, tools)
    if response.stop_reason != "tool_use":
        break
    for tool_call in response.tool_uses:
        result = await harness.execute_tool(tool_call)  # permission → hook → exec → hook
    messages.append(tool_results)
    # model sees results, decides next move — forever
```

---

## 🔧 Features Deep Dive

### Tools (43+)

| Category | Tools |
|----------|-------|
| **File I/O** | Bash, Read, Write, Edit, Glob, Grep |
| **Search** | WebFetch, WebSearch, ToolSearch, LSP |
| **Notebooks** | NotebookEdit |
| **Agents** | Agent, SendMessage, TeamCreate/Delete |
| **Tasks** | TaskCreate/Get/List/Update/Stop/Output |
| **MCP** | MCPTool, ListMcpResources, ReadMcpResource |
| **Schedule** | CronCreate/List/Delete, RemoteTrigger |
| **Meta** | Skill, Config, Brief, Sleep, AskUser |

Every tool: Pydantic input validation • Self-describing JSON Schema • Permission checks • Hook support.

### Skills System

On-demand knowledge loaded only when the model needs it:

```
commit, review, debug, plan, test, simplify, diagnose,
pdf, xlsx, ... 40+ more
```

Drop any `.md` skill file into `~/.openharness/skills/`. Compatible with [anthropics/skills](https://github.com/anthropics/skills).

### Plugin System

Compatible with [claude-code plugins](https://github.com/anthropics/claude-code/tree/main/plugins). Tested with 12 official plugins including `commit-commands`, `security-guidance`, `code-review`, `feature-dev`, and more.

```bash
oh plugin list
oh plugin install <source>
oh plugin enable <name>
```

### Permissions

```
default  → asks before every write or execute
auto     → allows everything (for sandboxes and people who enjoy danger)
plan     → blocks all writes (think before you wreck)
```

Path-level rules and command deny lists live in `settings.json`.

### Terminal UI

React/Ink TUI. Command picker, permission dialogs, mode switcher, session resume, animated spinner, keyboard shortcuts. Works in any terminal.

### Desktop App (Tauri)

`frontend/desktop/` — a full Tauri v2 desktop app. React 18 + TypeScript + Tailwind v4 + `@xyflow/react` for visual agent flow. Rust backend spawns the Python backend, forwards stdout as Tauri events. Same agent loop, native OS window.

```bash
cd frontend/desktop
npx tauri dev     # dev mode
npx tauri build   # production build
```

### Personal Agent — `ohmo`

`ohmo` is a personal-agent app built on top of BlacklistedBots. Your own workspace, your own gateway, your own channel config.

```bash
ohmo init          # initialize ~/.ohmo/ workspace
ohmo config        # configure gateway channels and provider profile
ohmo               # run the personal agent
ohmo gateway run   # run the gateway in foreground
ohmo gateway status
ohmo gateway restart
```

### CLI Reference

```
oh [OPTIONS] COMMAND [ARGS]

Session:     -c/--continue, -r/--resume, -n/--name
Model:       -m/--model, --effort, --max-turns
Output:      -p/--print, --output-format text|json|stream-json
Permissions: --permission-mode, --dangerously-skip-permissions
Context:     -s/--system-prompt, --append-system-prompt, --settings
Advanced:    -d/--debug, --mcp-config, --bare

Subcommands: oh setup | oh provider | oh auth | oh mcp | oh plugin
```

---

## 🗺️ Future Plans

BlacklistedBots isn't done. Far from it.

**Near term — tightening up the core:**
- [ ] Visual flow editor — wire agents together in the Tauri desktop UI with drag-and-drop
- [ ] Enhanced swarm coordination — smarter task delegation, agent-to-agent negotiation
- [ ] More provider support — more OpenAI-compatible backends, local-first setups
- [ ] `ohmo` channel expansion — richer Slack, Telegram, and Discord gateway integrations
- [ ] Improved context compression — smarter auto-compact strategies for long sessions
- [ ] Plugin marketplace — community-contributed skills, hooks, and agent workflows

**Medium term — going deeper:**
- [ ] Persistent agent identities — named bots with persistent memory and specializations
- [ ] Blacklisted Binary Labs bot network — coordinated multi-agent deployments across projects
- [ ] Native MCP server mode — expose BlacklistedBots as an MCP server for other clients
- [ ] Web dashboard — monitor running agents, inspect tool calls, manage permissions from a browser
- [ ] Signed skill packages — cryptographically verified skill distribution

**Long term — the vision:**
- [ ] Fully distributed swarm — agents that run across machines, coordinate over message queues
- [ ] Self-modifying agent infrastructure — harnesses that extend themselves via skills
- [ ] Community-run agent registry — publish, discover, and deploy named bots
- [ ] Full offline operation — run everything local with no external API dependencies

The community drives the roadmap. Open an issue. Submit a PR. Tell us what you need built.

---

## 🙏 Standing On Shoulders

**BlacklistedBots** is a fork of [**OpenHarness**](https://github.com/HKUDS/OpenHarness) by the [HKUDS](https://github.com/HKUDS) team.

They built the foundation: the agent loop engine, the tool registry, the permission system, the hooks architecture, the skills framework, the plugin compatibility layer, the MCP client, the multi-agent coordinator, the React TUI, and the `ohmo` personal-agent app.

That's not a small thing. That's hundreds of hours of careful engineering work made freely available to the world under the MIT license.

We took their architecture, kept what works (everything), and are building the Blacklisted Binary Labs layer on top: new branding, new direction, community-first development, and a commitment to keeping this forever free and open.

**Respect to the original authors. Serious respect.**

If you want the upstream project: [github.com/HKUDS/OpenHarness](https://github.com/HKUDS/OpenHarness).
If you want the Blacklisted Binary Labs version: you're already here. Stay a while.

---

## 🤝 Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md). Short version: fork, branch, write tests, open a PR. We review fast.

See [`CHANGELOG.md`](CHANGELOG.md) for what's changed and [`docs/SHOWCASE.md`](docs/SHOWCASE.md) for real usage examples.

---

## ⚖️ License

MIT. Do what you want. Build something weird. Ship it.

---

<p align="center">
  <strong>Blacklisted Binary Labs</strong><br>
  <em>We build the tools. You build the future.</em><br>
  <code>☠</code>
</p>
