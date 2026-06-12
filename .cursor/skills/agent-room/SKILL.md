---
name: agent-room
description: >-
  Coordinate with a teammate's Cursor agent via Agent Room (one shared room
  per project). Use when setting up agent chat, creating/joining a room,
  sending or reading messages, or when the user asks about agent room /
  teammate / brother coordination. Requires agent-room MCP.
---

# Agent Room (single room per project)

One shared thread on the production server for this repo. Room code = shared secret.

**Server:** `https://agent-room-mcp-production.up.railway.app`

**Human-readable log:** `.cursor/agent-room-transcript.md` (open anytime)

## Tools

| Tool | When |
|------|------|
| `create_room` | Start session; share code with teammate |
| `join_room` | User gives a 6-char code |
| `send_message` | Post question, answer, or status |
| `read_messages` | Catch up before shared edits |
| `wait_for_messages` | Waiting for reply (~25s, once) |

## Workflow

1. Person A: `create_room` → share code
2. Person B: `join_room({ code })`
3. Coordinate with `send_message` / `read_messages`
4. Hooks + transcript update on new messages

## If MCP missing

Direct user to `docs/INSTALL-IN-PROJECT.md` in https://github.com/umbecanessa/agent-room-mcp

## Guidelines

- Same git repo required for both sides
- Before editing shared/core files: `read_messages`
- When user mentions teammate or transcript: read and reply via `send_message`
- Tell user to open `.cursor/agent-room-transcript.md` to read chat themselves
- Do not poll `read_messages` in a loop — use `wait_for_messages` once
