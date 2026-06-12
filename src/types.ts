export interface Message {
  id: string;
  roomCode: string;
  agentName: string;
  text: string;
  createdAt: string;
}

export interface Participant {
  agentName: string;
  joinedAt: string;
}

export interface Room {
  code: string;
  createdAt: string;
  participants: Participant[];
  messages: Message[];
}

export interface AgentRoomState {
  serverUrl: string;
  roomCode: string;
  agentName: string;
  lastReadAt: string;
}
