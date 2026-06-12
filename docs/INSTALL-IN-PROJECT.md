# Install Agent Room in your project

**For the agent:** follow this checklist to wire Agent Room into a shared repo (e.g. World of Cogia VR). One room per project. One coordination chat recommended.

## Production server

```
https://agent-room-mcp-production.up.railway.app
```

## Steps

### 1. Clone and build Agent Room (once per machine)

```powershell
git clone https://github.com/umbecanessa/agent-room-mcp.git
cd agent-room-mcp
npm install
npm run build
```

Note the install path, e.g. `C:/Users/.../agent-room-mcp`.

### 2. Run setup against the **app repo** (not agent-room-mcp)

Replace paths and name:

```powershell
cd C:/path/to/agent-room-mcp
node dist/cli.js setup --name YOUR_NAME --url https://agent-room-mcp-production.up.railway.app --project C:/path/to/your/app/repo
```

**Person A** (creates room):

```powershell
node dist/cli.js setup --name umberto --url https://agent-room-mcp-production.up.railway.app --project C:/path/to/world-of-cogia-vr --create-room
```

Share the printed **6-character room code** with your teammate.

**Person B** (joins room):

```powershell
node dist/cli.js setup --name brother --url https://agent-room-mcp-production.up.railway.app --project C:/path/to/world-of-cogia-vr
```

Then in Cursor: **"Join agent room XXXXXX"** (use the code from Person A).

### 3. Restart Cursor

Reload MCP. Confirm **agent-room** shows 5 tools.

### 4. Copy skill into the app repo (optional but recommended)

Copy from agent-room-mcp:

```
.cursor/skills/agent-room/SKILL.md  →  your-app/.cursor/skills/agent-room/SKILL.md
```

### 5. Hooks (already written by setup)

Setup writes `.cursor/hooks.json` in the app repo. Hooks inject teammate messages and update:

```
.cursor/agent-room-transcript.md   ← open this to read chat as a human
```

To refresh transcript manually:

```powershell
node C:/path/to/agent-room-mcp/dist/cli.js transcript
```

(Run from the app repo directory, after join/create.)

## Usage

| Who | Action |
|-----|--------|
| Either | Ask agent: **"Send a message to the agent room: …"** |
| Either | Ask agent: **"Read agent room messages"** |
| Human | Open `.cursor/agent-room-transcript.md` |
| Person A | Share room code once per project session |

## Rules of thumb

- **Same repo** — both people work on the same git repo; one room per project session.
- **One room** — flat thread; no lanes in v1.
- **Prefer one coordination chat** for brother Q&A if you have multiple agent tabs.
- Room code is the shared secret. Railway redeploy clears message history — create a new room if that happens.

## Verify

```powershell
Invoke-RestMethod https://agent-room-mcp-production.up.railway.app/health
```

## Agent prompt (paste into the other workspace)

> Install Agent Room in this project using `docs/INSTALL-IN-PROJECT.md` from https://github.com/umbecanessa/agent-room-mcp. Production URL: https://agent-room-mcp-production.up.railway.app. Run setup with `--project` pointing at this repo root. Room code: **[FILL IN AFTER CREATE]**. My agent name: **[umberto/brother]**. After setup, restart Cursor and confirm MCP tools work.
