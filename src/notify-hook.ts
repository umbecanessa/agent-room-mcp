import { readFile, writeFile } from "node:fs/promises";
import { getStatePath, formatMessagesForAgent } from "./state.js";
import type { AgentRoomState, Message } from "./types.js";

export interface NotifyHookResult {
  user_message?: string;
  agent_message?: string;
}

async function fetchMessages(
  state: AgentRoomState,
): Promise<Message[]> {
  const url = new URL(
    `/rooms/${state.roomCode}/messages`,
    state.serverUrl,
  );
  url.searchParams.set("since", state.lastReadAt);
  url.searchParams.set("limit", "50");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch messages: ${res.status}`);
  }

  const data = (await res.json()) as { messages: Message[] };
  return data.messages ?? [];
}

async function updateStateLastRead(
  statePath: string,
  state: AgentRoomState,
  messages: Message[],
): Promise<void> {
  if (messages.length === 0) return;

  const latest = messages[messages.length - 1]!.createdAt;
  state.lastReadAt = latest;
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export async function runNotifyHook(cwd = process.cwd()): Promise<NotifyHookResult> {
  const statePath = getStatePath(cwd);

  let state: AgentRoomState;
  try {
    const raw = await readFile(statePath, "utf8");
    state = JSON.parse(raw) as AgentRoomState;
  } catch {
    return {};
  }

  if (!state.roomCode || !state.serverUrl) {
    return {};
  }

  let messages: Message[];
  try {
    messages = await fetchMessages(state);
  } catch {
    return {};
  }

  if (messages.length === 0) {
    return {};
  }

  await updateStateLastRead(statePath, state, messages);

  const formatted = formatMessagesForAgent(messages);
  return {
    user_message: "New message(s) in Agent Room from your teammate.",
    agent_message: `Teammate agent chat (Agent Room):\n${formatted}\n\nRead these before continuing. Use send_message or read_messages if you need to reply.`,
  };
}
