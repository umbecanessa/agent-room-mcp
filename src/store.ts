import { randomBytes } from "node:crypto";
import type { Message, Participant, Room } from "./types.js";

const ROOM_CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

const rooms = new Map<string, Room>();
const waiters = new Map<string, Set<(messages: Message[]) => void>>();

function generateRoomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[bytes[i]! % ROOM_CODE_CHARS.length];
  }
  return code;
}

export function createRoom(): Room {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room: Room = {
    code,
    createdAt: new Date().toISOString(),
    participants: [],
    messages: [],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code: string, agentName: string): Room {
  const room = getRoom(code);
  if (!room) {
    throw new Error(`Room not found: ${code}`);
  }

  const normalized = agentName.trim();
  if (!normalized) {
    throw new Error("agentName is required");
  }

  const existing = room.participants.find((p) => p.agentName === normalized);
  if (!existing) {
    room.participants.push({
      agentName: normalized,
      joinedAt: new Date().toISOString(),
    });
  }

  return room;
}

export function addMessage(
  code: string,
  agentName: string,
  text: string,
  id: string,
): Message {
  const room = getRoom(code);
  if (!room) {
    throw new Error(`Room not found: ${code}`);
  }

  const normalizedName = agentName.trim();
  const normalizedText = text.trim();
  if (!normalizedName) {
    throw new Error("agentName is required");
  }
  if (!normalizedText) {
    throw new Error("text is required");
  }

  const message: Message = {
    id,
    roomCode: room.code,
    agentName: normalizedName,
    text: normalizedText,
    createdAt: new Date().toISOString(),
  };

  room.messages.push(message);
  notifyWaiters(room.code, [message]);
  return message;
}

export function getMessages(
  code: string,
  since?: string,
  limit = 50,
): Message[] {
  const room = getRoom(code);
  if (!room) {
    throw new Error(`Room not found: ${code}`);
  }

  let messages = room.messages;
  if (since) {
    const sinceTime = Date.parse(since);
    messages = messages.filter((m) => Date.parse(m.createdAt) > sinceTime);
  }

  const capped = Math.min(Math.max(limit, 1), 200);
  return messages.slice(-capped);
}

export function waitForMessages(
  code: string,
  since?: string,
  timeoutMs = 25_000,
): Promise<Message[]> {
  const room = getRoom(code);
  if (!room) {
    throw new Error(`Room not found: ${code}`);
  }

  const pending = getMessages(code, since, 200);
  if (pending.length > 0) {
    return Promise.resolve(pending);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (messages: Message[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const set = waiters.get(code);
      if (set) {
        set.delete(onMessage);
        if (set.size === 0) waiters.delete(code);
      }
      resolve(messages);
    };

    const onMessage = () => {
      finish(getMessages(code, since, 200));
    };

    let set = waiters.get(code);
    if (!set) {
      set = new Set();
      waiters.set(code, set);
    }
    set.add(onMessage);

    const timer = setTimeout(() => finish([]), timeoutMs);
  });
}

function notifyWaiters(code: string, _newMessages: Message[]): void {
  const set = waiters.get(code);
  if (!set) return;
  for (const callback of set) {
    callback(_newMessages);
  }
}
