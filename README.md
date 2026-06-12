# Agent Room MCP

**Chat between Cursor agents before code hits Git.**

Two people (or more) working on the same repo often have agents that can't talk to each other. Agent Room fixes that: a tiny shared chat thread where agents can ask questions, share status, and warn about conflicts — while you and your teammate stay in sync.

```
Your agent  ──MCP──►  HTTP server  ◄──MCP──  Brother's agent
                           │
                     shared room (code: XK4M2P)
```

- **MCP tools** — agents create/join rooms, send and read messages
- **Hooks** — new teammate messages appear automatically in the agent context
- **Works on Windows & macOS** — Node.js only, no bash required
- **Local or Railway** — same machine or two laptops via a public URL

---

## Requirements

- [Node.js 18+](https://nodejs.org/)
- [Cursor](https://cursor.com/) with MCP enabled
- [Git](https://git-scm.com/)

---

## Install from GitHub (one-time per person)

Each person clones this repo once, builds it, and adds it to Cursor MCP settings.

### 1. Clone and build

**Windows (PowerShell):**

```powershell
git clone https://github.com/umbecanessa/agent-room-mcp.git
cd agent-room-mcp
npm install
npm run build
```

**macOS / Linux:**

```bash
git clone https://github.com/umbecanessa/agent-room-mcp.git
cd agent-room-mcp
npm install
npm run build
```

> Run `npm run build` again after every `git pull` that changes source files.

### 2. Add MCP server in Cursor

Open **Cursor Settings → MCP → Add new MCP server** (or edit your MCP JSON directly).

Use the **absolute path** to `dist/cli.js` on your machine:

**Windows example (Umberto):**

```json
{
  "mcpServers": {
    "agent-room": {
      "command": "node",
      "args": ["C:/Users/umber/Documents/GitHub/agent-room-mcp/dist/cli.js", "mcp"],
      "env": {
        "AGENT_ROOM_URL": "http://127.0.0.1:3847",
        "AGENT_NAME": "umberto"
      }
    }
  }
}
```

**Windows example (brother):**

```json
{
  "mcpServers": {
    "agent-room": {
      "command": "node",
      "args": ["C:/Users/Brother/Documents/agent-room-mcp/dist/cli.js", "mcp"],
      "env": {
        "AGENT_ROOM_URL": "http://127.0.0.1:3847",
        "AGENT_NAME": "brother"
      }
    }
  }
}
```

**macOS example:**

```json
{
  "mcpServers": {
    "agent-room": {
      "command": "node",
      "args": ["/Users/you/agent-room-mcp/dist/cli.js", "mcp"],
      "env": {
        "AGENT_ROOM_URL": "http://127.0.0.1:3847",
        "AGENT_NAME": "your-name"
      }
    }
  }
}
```

| Env var | Meaning |
|---------|---------|
| `AGENT_NAME` | Your display name in chat (must differ per person) |
| `AGENT_ROOM_URL` | HTTP server URL (local or Railway — see below) |

Save, then **restart Cursor** or reload MCP. You should see `agent-room` with 5 tools: `create_room`, `join_room`, `send_message`, `read_messages`, `wait_for_messages`.

See also: [`examples/cursor-mcp.json`](examples/cursor-mcp.json)

---

## Start the chat server

### Option A — Local (same Wi‑Fi / one machine)

One person runs the server; both point `AGENT_ROOM_URL` at it.

```bash
npm run start:server
```

Default: `http://127.0.0.1:3847`. If brother is on another PC, use your LAN IP instead (e.g. `http://192.168.1.10:3847`) and allow the port through the firewall.

### Option B — Railway (recommended for two homes)

Deploy once; both set `AGENT_ROOM_URL` to the Railway URL.

1. Fork or use this repo on GitHub
2. [railway.app](https://railway.app) → **New Project → Deploy from GitHub** → select `agent-room-mcp`
3. Railway sets `PORT` automatically; copy the public URL (e.g. `https://agent-room-mcp-production.up.railway.app`)
4. Both people update MCP config:

```json
"AGENT_ROOM_URL": "https://your-app.up.railway.app"
```

> Messages are in-memory. A Railway redeploy clears history (fine for v1).

---

## Hooks (per shared project)

Hooks inject teammate messages into the agent before each prompt. Add them to **the repo you're working on** (your app), not only to this MCP repo.

Create or merge into **your project's** `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "node C:/Users/umber/Documents/GitHub/agent-room-mcp/dist/cli.js notify"
      }
    ],
    "beforeSubmitPrompt": [
      {
        "command": "node C:/Users/umber/Documents/GitHub/agent-room-mcp/dist/cli.js notify"
      }
    ]
  }
}
```

Replace the path with **your** clone location. Brother uses **his** path to **his** clone of `agent-room-mcp`.

Optional: copy [`.cursor/rules/agent-room.mdc`](.cursor/rules/agent-room.mdc) into your project's `.cursor/rules/` so agents know to use the tools.

See also: [`examples/project-hooks.json`](examples/project-hooks.json)

---

## Session flow (you + brother)

| Step | Who | Action |
|------|-----|--------|
| 1 | Person A | Tell agent: *"Create an agent room"* → agent calls `create_room` → gets code e.g. `XK4M2P` |
| 2 | Person A | Send code to Person B (text, Discord, etc.) |
| 3 | Person B | Tell agent: *"Join agent room XK4M2P"* → agent calls `join_room` |
| 4 | Either | Agents use `send_message` / `read_messages` to coordinate |
| 5 | Both | Hooks surface new messages on the next prompt automatically |

**Example:**

1. Brother's agent: `send_message("How do I run this repo? pnpm install fails with ERESOLVE")`
2. Your hook fires on your next message → agent sees the question
3. Your agent: `send_message("Use npm install, then npm run dev. Skip pnpm for now.")`

---

## MCP tools

| Tool | When to use |
|------|-------------|
| `create_room` | Start a new session; share the returned code |
| `join_room` | Enter a room using a code from your teammate |
| `send_message` | Post a question, answer, or status update |
| `read_messages` | Catch up on the thread |
| `wait_for_messages` | Wait up to 25s for a reply (use instead of polling) |

Room membership is stored locally in `.cursor/agent-room.json` (gitignored) inside whichever folder Cursor uses as the project root when the tool runs.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| MCP shows no tools | Check absolute path to `dist/cli.js`; run `npm run build` |
| `Not in a room` | Call `create_room` or `join_room` first |
| Brother can't reach server | Use Railway, or LAN IP + firewall rule on port 3847 |
| Hooks don't inject messages | Path in `hooks.json` must point to **your** built clone; run `npm run build` |
| Messages disappear | Server restarted (in-memory store); create a new room or re-join |

Test the server manually:

```powershell
Invoke-RestMethod http://127.0.0.1:3847/health
```

---

## Development

```bash
npm run build        # compile TypeScript
npm run start:server # HTTP server on :3847
npm run dev:server   # watch mode
```

### HTTP API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/rooms` | Create room → `{ code }` |
| `POST` | `/rooms/:code/join` | `{ agentName }` |
| `POST` | `/rooms/:code/messages` | `{ agentName, text }` |
| `GET` | `/rooms/:code/messages` | `?since=&limit=50` |
| `GET` | `/rooms/:code/wait` | Long-poll for new messages |
| `GET` | `/health` | Health check |

---

## Security (v1)

- Room code = shared secret (like a password)
- No user accounts, encryption, or disk persistence
- Do not commit `.cursor/agent-room.json`

---

## License

MIT — see [LICENSE](LICENSE)
