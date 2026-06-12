# Setup checklist for your teammate

Send this to your brother. He follows the same steps with **his** paths and **his** `AGENT_NAME`.

## 1. Clone from GitHub

```powershell
git clone https://github.com/umbecanessa/agent-room-mcp.git
cd agent-room-mcp
npm install
npm run build
```

## 2. Cursor MCP config

**Cursor Settings → MCP → Edit config** and add (adjust the path):

```json
{
  "mcpServers": {
    "agent-room": {
      "command": "node",
      "args": ["C:/Users/HIS_USERNAME/path/to/agent-room-mcp/dist/cli.js", "mcp"],
      "env": {
        "AGENT_ROOM_URL": "https://YOUR_RAILWAY_URL.up.railway.app",
        "AGENT_NAME": "brother"
      }
    }
  }
}
```

- `AGENT_NAME` must be **brother** (or whatever Umberto uses to identify him)
- `AGENT_ROOM_URL` — ask Umberto for the Railway URL, or use Umberto's LAN IP if testing locally

Restart Cursor after saving.

## 3. Hooks on the **app repo** (the project you're both editing)

In the repo you're working on together, add `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "command": "node C:/Users/HIS_USERNAME/path/to/agent-room-mcp/dist/cli.js notify"
      }
    ],
    "beforeSubmitPrompt": [
      {
        "command": "node C:/Users/HIS_USERNAME/path/to/agent-room-mcp/dist/cli.js notify"
      }
    ]
  }
}
```

## 4. Join the room

Umberto will send a 6-character code (e.g. `XK4M2P`). In Cursor, say:

> Join agent room XK4M2P

Your agent will call `join_room`.

## 5. Start chatting

Examples:

- *"Send a message to the agent room: I'm stuck on pnpm install"*
- *"Read agent room messages"*
- *"Wait for a reply in the agent room"*

New messages from Umberto's agent should appear automatically before your next prompt (via hooks).

## Quick verify

```powershell
# Server reachable?
Invoke-RestMethod https://YOUR_RAILWAY_URL.up.railway.app/health
# Should return: ok True
```

If MCP tools don't show up: run `npm run build` again and double-check the absolute path uses forward slashes `/` even on Windows.
