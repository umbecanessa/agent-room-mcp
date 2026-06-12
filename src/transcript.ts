import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentRoomState, Message } from "./types.js";

const TRANSCRIPT_FILE = "agent-room-transcript.md";

export function getTranscriptPath(cwd = process.cwd()): string {
  return join(cwd, ".cursor", TRANSCRIPT_FILE);
}

function formatLine(message: Message): string {
  const time = new Date(message.createdAt).toISOString().replace("T", " ").slice(0, 16);
  return `- **[${message.agentName} @ ${time} UTC]** ${message.text} \`#${message.id.slice(0, 8)}\``;
}

async function ensureHeader(cwd: string, state: AgentRoomState): Promise<void> {
  const path = getTranscriptPath(cwd);
  try {
    await readFile(path, "utf8");
  } catch {
    await mkdir(join(cwd, ".cursor"), { recursive: true });
    const header = `# Agent Room transcript

Room: **${state.roomCode}** · Server: ${state.serverUrl}

Open this file anytime to read what agents shared. Updated automatically.

---

`;
    await writeFile(path, header, "utf8");
  }
}

export async function appendMessagesToTranscript(
  messages: Message[],
  cwd = process.cwd(),
  state?: AgentRoomState | null,
): Promise<void> {
  if (messages.length === 0) return;

  const activeState = state ?? null;
  if (activeState) {
    await ensureHeader(cwd, activeState);
  }

  const path = getTranscriptPath(cwd);
  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch {
    if (activeState) await ensureHeader(cwd, activeState);
  }

  const lines: string[] = [];
  for (const message of messages) {
    const tag = `#${message.id.slice(0, 8)}`;
    if (existing.includes(tag)) continue;
    lines.push(formatLine(message));
  }

  if (lines.length === 0) return;
  await appendFile(path, lines.join("\n") + "\n", "utf8");
}

export async function syncTranscript(
  state: AgentRoomState,
  fetchAll: (roomCode: string) => Promise<Message[]>,
  cwd = process.cwd(),
): Promise<string> {
  const messages = await fetchAll(state.roomCode);
  await mkdir(join(cwd, ".cursor"), { recursive: true });

  const header = `# Agent Room transcript

Room: **${state.roomCode}** · Server: ${state.serverUrl}

_Last synced: ${new Date().toISOString()}_

---

`;

  const body =
    messages.length === 0
      ? "_No messages yet._\n"
      : messages.map(formatLine).join("\n") + "\n";

  const path = getTranscriptPath(cwd);
  await writeFile(path, header + body, "utf8");
  return path;
}

export function formatMessagesForAgent(
  messages: Array<{ agentName: string; text: string; createdAt: string }>,
): string {
  if (messages.length === 0) return "No messages yet.";
  return messages
    .map((m) => {
      const time = new Date(m.createdAt).toISOString().slice(11, 16);
      return `- [${m.agentName} @ ${time}] ${m.text}`;
    })
    .join("\n");
}
