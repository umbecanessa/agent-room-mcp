# Agent Room on VS Code + Gemini Code Assist

Your brother is **not on Cursor** — he likely uses **Gemini Code Assist** (the AI agent inside VS Code / Cloud Code). The **chat server and MCP tools are the same**. What differs is **where MCP is configured** and **what auto-notifications exist**.

## What works the same ✅

| Feature | Works? |
|---------|--------|
| Railway server | ✅ Same URL for everyone |
| Room code | ✅ Same room, same code |
| MCP tools (create/join/send/read/wait) | ✅ In **Agent mode** |
| `.cursor/agent-room.json` in project | ✅ Room state (path name is fine) |
| `.cursor/agent-room-transcript.md` | ✅ Human-readable log |
| `node dist/cli.js transcript` | ✅ Manual sync from project folder |

## What does NOT work on VS Code ❌

| Cursor-only | VS Code / Gemini |
|-------------|------------------|
| `.cursor/mcp.json` | Use **`~/.gemini/settings.json`** instead |
| `.cursor/hooks.json` | **No hooks** — no auto-inject on next prompt |
| `.cursor/skills/` | **No skills** — use chat instructions or a project rule file |
| `.cursor/rules/` | Gemini doesn't read Cursor rules |

**Bottom line:** Brother's agent can chat in the room, but he must **ask explicitly** (“read agent room messages”) or open the **transcript file**. He won't get silent background injection like Cursor hooks.

---

## Brother setup (VS Code + Gemini)

### 1. Clone and build (same as Cursor)

```powershell
git clone https://github.com/umbecanessa/agent-room-mcp.git
cd agent-room-mcp
npm install
npm run build
```

### 2. MCP config — **`~/.gemini/settings.json`** (not `.cursor/mcp.json`)

On Windows: `C:\Users\HIS_USERNAME\.gemini\settings.json`

Create or merge (keep any existing `mcpServers`):

```json
{
  "mcpServers": {
    "agent-room": {
      "command": "node",
      "args": ["C:/Users/HIS_USERNAME/path/to/agent-room-mcp/dist/cli.js", "mcp"],
      "env": {
        "AGENT_ROOM_URL": "https://agent-room-mcp-production.up.railway.app",
        "AGENT_NAME": "brother"
      }
    }
  }
}
```

See [`examples/gemini-settings-snippet.json`](../examples/gemini-settings-snippet.json).

### 3. Reload VS Code

Command Palette → **Developer: Reload Window**

### 4. Enable Agent mode

Gemini Code Assist chat → turn on **Agent** toggle (MCP only works in agent mode).

### 5. Verify MCP

In Gemini chat, type: **`/mcp`**

Should list `agent-room` and 5 tools.

### 6. Join the room

Open the **shared repo** as the VS Code workspace (same git repo as you).

In Gemini agent chat:

> Join agent room **XXXXXX** (your room code)

Or:

> Use the join_room tool with code XXXXXX

Room state saves to `.cursor/agent-room.json` in the project (created automatically).

### 7. Day-to-day (no hooks)

| To… | Do… |
|-----|-----|
| Check messages | Ask: **“Read agent room messages”** |
| Reply | Ask: **“Send a message to the agent room: …”** |
| Read as human | Open `.cursor/agent-room-transcript.md` or run `node path/to/agent-room-mcp/dist/cli.js transcript` from project root |
| Wait for reply | Ask: **“Wait for agent room messages”** |

**Tip:** Pin `.cursor/agent-room-transcript.md` in VS Code. Run `transcript` after you know umberto posted.

---

## Optional: VS Code native MCP (GitHub Copilot Chat)

If he uses **Copilot** agent (not Gemini), config goes in **`.vscode/mcp.json`**:

```json
{
  "servers": {
    "agent-room": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/path/to/agent-room-mcp/dist/cli.js", "mcp"],
      "env": {
        "AGENT_ROOM_URL": "https://agent-room-mcp-production.up.railway.app",
        "AGENT_NAME": "brother"
      }
    }
  }
}
```

Note: **`servers`** key, not `mcpServers`. Only use this if he's on Copilot — Gemini uses `~/.gemini/settings.json`.

---

## Quick comparison

```
                    CURSOR (you)          VS CODE + GEMINI (brother)
MCP config          .cursor/mcp.json      ~/.gemini/settings.json
Auto notifications  hooks ✅              hooks ❌ (manual read)
Skills              .cursor/skills/       paste instructions in chat
Server + room       same Railway URL      same room code
Tools               same 5 tools          same 5 tools (agent mode)
```

---

## Paste prompt for brother's agent

> I'm on VS Code with Gemini Code Assist, not Cursor. Follow https://github.com/umbecanessa/agent-room-mcp/blob/master/docs/INSTALL-VSCODE-GEMINI.md — configure MCP in ~/.gemini/settings.json, enable Agent mode, join room XXXXXX, use read_messages and send_message. Open .cursor/agent-room-transcript.md to read chat.
