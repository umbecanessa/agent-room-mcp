import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  defaultState,
  formatMessagesForAgent,
  resolveActiveState,
  updateLastReadAt,
  writeState,
} from "./state.js";
import { appendMessagesToTranscript } from "./transcript.js";
import type { Message } from "./types.js";

const DEFAULT_SERVER_URL = "http://127.0.0.1:3847";

function getServerUrl(): string {
  return process.env.AGENT_ROOM_URL ?? DEFAULT_SERVER_URL;
}

function getAgentName(override?: string): string {
  const name = override ?? process.env.AGENT_NAME;
  if (!name?.trim()) {
    throw new Error(
      "AGENT_NAME is required. Set it in MCP config env or pass agentName to join_room.",
    );
  }
  return name.trim();
}

async function apiFetch(path: string, init?: RequestInit) {
  const url = new URL(path, getServerUrl());
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res;
}

async function requireActiveState() {
  const state = await resolveActiveState();
  if (!state?.roomCode) {
    throw new Error(
      "Not in a room. Call create_room or join_room first, or set AGENT_ROOM_CODE.",
    );
  }
  return state;
}

async function fetchMessages(
  roomCode: string,
  since?: string,
  limit = 50,
): Promise<Message[]> {
  const url = new URL(`/rooms/${roomCode}/messages`, getServerUrl());
  if (since) url.searchParams.set("since", since);
  url.searchParams.set("limit", String(limit));

  const res = await apiFetch(url.pathname + url.search);
  const data = (await res.json()) as { messages: Message[] };
  return data.messages;
}

async function markRead(messages: Message[]): Promise<void> {
  if (messages.length === 0) return;
  const latest = messages[messages.length - 1]!.createdAt;
  await updateLastReadAt(latest);
  const state = await resolveActiveState();
  await appendMessagesToTranscript(messages, process.cwd(), state);
}

export async function startMcpServer() {
  const server = new McpServer({
    name: "agent-room",
    version: "1.1.0",
  });

  server.tool(
    "create_room",
    "Create a new shared chat room for coordinating with teammate agents. Use when starting a new collaboration session. Share the returned room code with your teammate so their agent can join_room.",
    {},
    async () => {
      const res = await apiFetch("/rooms", { method: "POST" });
      const data = (await res.json()) as { code: string };
      const agentName = getAgentName();

      await writeState(defaultState(getServerUrl(), data.code, agentName));

      return {
        content: [
          {
            type: "text" as const,
            text: `Room created: **${data.code}**\n\nShare this code with your teammate. Their agent should call \`join_room\` with code \`${data.code}\`.`,
          },
        ],
      };
    },
  );

  server.tool(
    "join_room",
    "Join an existing Agent Room using a room code shared by a teammate. Use when the user gives you a room code or asks you to connect to a teammate's session.",
    {
      code: z.string().describe("6-character room code, e.g. XK4M2P"),
      agentName: z
        .string()
        .optional()
        .describe("Override AGENT_NAME env for this session"),
    },
    async ({ code, agentName: nameOverride }) => {
      const agentName = getAgentName(nameOverride);

      await apiFetch(`/rooms/${code.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName }),
      });

      await writeState(
        defaultState(getServerUrl(), code.toUpperCase(), agentName),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Joined room **${code.toUpperCase()}** as **${agentName}**. Use send_message to chat and read_messages to catch up.`,
          },
        ],
      };
    },
  );

  server.tool(
    "send_message",
    "Post a message to the shared Agent Room thread. Use to answer a teammate's question, share status, warn about conflicts, or ask for help before making git changes.",
    {
      text: z.string().describe("Message text to send to the room"),
    },
    async ({ text }) => {
      const state = await requireActiveState();

      const res = await apiFetch(`/rooms/${state.roomCode}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: state.agentName, text }),
      });

      const message = (await res.json()) as Message;
      await appendMessagesToTranscript([message], process.cwd(), state);

      return {
        content: [
          {
            type: "text" as const,
            text: `Message sent (id: ${message.id})`,
          },
        ],
      };
    },
  );

  server.tool(
    "read_messages",
    "Read recent messages from the Agent Room. Use before editing shared files, when catching up on teammate updates, or when the user mentions Agent Room messages.",
    {
      limit: z
        .number()
        .optional()
        .describe("Max messages to return (default 50)"),
      since: z
        .string()
        .optional()
        .describe("ISO timestamp — only messages after this time"),
    },
    async ({ limit, since }) => {
      const state = await requireActiveState();
      const effectiveSince = since ?? state.lastReadAt;
      const messages = await fetchMessages(
        state.roomCode,
        effectiveSince,
        limit ?? 50,
      );

      await markRead(messages);

      return {
        content: [
          {
            type: "text" as const,
            text: formatMessagesForAgent(messages),
          },
        ],
      };
    },
  );

  server.tool(
    "wait_for_messages",
    "Long-poll for new teammate messages (up to 30s). Use when waiting for a teammate's answer, or when the user says the other agent might reply soon. Prefer this over repeatedly calling read_messages.",
    {
      timeoutSeconds: z
        .number()
        .optional()
        .describe("Seconds to wait (default 25, max 30)"),
    },
    async ({ timeoutSeconds }) => {
      const state = await requireActiveState();
      const timeout = Math.min(Math.max(timeoutSeconds ?? 25, 1), 30);

      const url = new URL(`/rooms/${state.roomCode}/wait`, getServerUrl());
      url.searchParams.set("since", state.lastReadAt);
      url.searchParams.set("timeout", String(timeout));

      const res = await apiFetch(url.pathname + url.search);
      const data = (await res.json()) as { messages: Message[] };
      const messages = data.messages ?? [];

      if (messages.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No new messages." }],
        };
      }

      await markRead(messages);

      return {
        content: [
          {
            type: "text" as const,
            text: formatMessagesForAgent(messages),
          },
        ],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
