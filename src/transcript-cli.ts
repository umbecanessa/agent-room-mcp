import { resolveActiveState } from "./state.js";
import { syncTranscript } from "./transcript.js";
import type { Message } from "./types.js";

export async function runTranscript(cwd = process.cwd()): Promise<void> {
  const state = await resolveActiveState(process.env, cwd);

  if (!state?.roomCode) {
    console.error("Not in a room. Run setup with --create-room or join via agent first.");
    process.exit(1);
  }

  const fetchAll = async (roomCode: string): Promise<Message[]> => {
    const url = new URL(`/rooms/${roomCode}/messages`, state.serverUrl);
    url.searchParams.set("limit", "200");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { messages: Message[] };
    return data.messages ?? [];
  };

  const path = await syncTranscript(state, fetchAll, cwd);
  console.log(`Transcript synced: ${path}`);
}
