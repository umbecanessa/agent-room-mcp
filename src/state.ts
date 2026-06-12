import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentRoomState } from "./types.js";

const STATE_DIR = ".cursor";
const STATE_FILE = "agent-room.json";
const DEFAULT_LAST_READ = "1970-01-01T00:00:00.000Z";

export function getStatePath(cwd = process.cwd()): string {
  return join(cwd, STATE_DIR, STATE_FILE);
}

export async function readState(cwd = process.cwd()): Promise<AgentRoomState | null> {
  try {
    const raw = await readFile(getStatePath(cwd), "utf8");
    return JSON.parse(raw) as AgentRoomState;
  } catch {
    return null;
  }
}

export async function writeState(
  state: AgentRoomState,
  cwd = process.cwd(),
): Promise<void> {
  const dir = join(cwd, STATE_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(getStatePath(cwd), JSON.stringify(state, null, 2) + "\n", "utf8");
}

export async function updateLastReadAt(
  lastReadAt: string,
  cwd = process.cwd(),
): Promise<void> {
  const state = await readState(cwd);
  if (!state) return;
  state.lastReadAt = lastReadAt;
  await writeState(state, cwd);
}

export function defaultState(
  serverUrl: string,
  roomCode: string,
  agentName: string,
): AgentRoomState {
  return {
    serverUrl,
    roomCode,
    agentName,
    lastReadAt: DEFAULT_LAST_READ,
  };
}

export function resolveActiveState(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): Promise<AgentRoomState | null> {
  return readState(cwd).then((fileState) => {
    const serverUrl =
      env.AGENT_ROOM_URL ?? fileState?.serverUrl ?? "http://127.0.0.1:3847";
    const roomCode = env.AGENT_ROOM_CODE ?? fileState?.roomCode;
    const agentName = env.AGENT_NAME ?? fileState?.agentName;

    if (!roomCode || !agentName) {
      return fileState;
    }

    return {
      serverUrl,
      roomCode,
      agentName,
      lastReadAt: fileState?.lastReadAt ?? DEFAULT_LAST_READ,
    };
  });
}

export { formatMessagesForAgent } from "./transcript.js";
