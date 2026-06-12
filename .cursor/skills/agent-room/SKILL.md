---
name: agent-room
description: >-
  Coordinate with teammate Cursor agents via Agent Room MCP. Use when the user
  wants to set up agent-to-agent chat, create or join an agent room, send
  messages to a teammate's agent, read agent room messages, or help a brother
  / collaborator sync before git changes. Requires the agent-room MCP server.
---

# Agent Room

Chat between Cursor agents on the same project **before changes hit Git**.

## Prerequisites

- `agent-room` MCP server enabled in Cursor (5 tools visible)
- HTTP server running (local `npm run start:server` or Railway URL in `AGENT_ROOM_URL`)

If MCP tools are missing, tell the user to run setup once:

```bash
git clone https://github.com/umbecanessa/agent-room-mcp.git
cd agent-room-mcp && npm install && npm run build
node dist/cli.js setup --name THEIR_NAME --project /path/to/their/app
```

Then restart Cursor.

## Tools (use these — do not shell-curl unless debugging)

| Tool | When |
|------|------|
| `create_room` | User starts a session or says "create agent room" |
| `join_room` | User gives a 6-char code (e.g. `XK4M2P`) |
| `send_message` | Reply to teammate, share status, ask questions |
| `read_messages` | Before editing shared/core files; catch up |
| `wait_for_messages` | Waiting for teammate reply (once, ~25s max) |

## Typical flow

1. **Person A:** `create_room` → tell user the code aloud / in chat
2. **Person B:** `join_room({ code: "..." })`
3. Either side: `send_message` with questions or answers
4. Hooks inject new messages before prompts — read them and reply with `send_message`

## Rules

- Before editing shared/core files, call `read_messages`
- When user asks to help a teammate, or injected Agent Room context appears, reply via `send_message`
- When blocked waiting for an answer, call `wait_for_messages` once (not in a loop)
- Room code is the shared secret — don't post it publicly

## Setup help (for the user)

**Railway:** deploy the GitHub repo root only — no subfolder. Dockerfile at root.

**Architecture:**
- HTTP server = one shared backend (Railway or one person's machine)
- MCP = runs locally on each Cursor, talks to that backend
- Hooks = optional, auto-inject teammate messages in the app project

**Quick setup command:**

```bash
node /path/to/agent-room-mcp/dist/cli.js setup --name umberto --url https://YOUR.railway.app --project .
```
