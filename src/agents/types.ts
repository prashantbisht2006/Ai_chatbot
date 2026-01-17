import type { Channel, StreamChat, User } from "stream-chat";

export interface AIAgent {
  user?: User;
  channel: Channel;
  chatClient: StreamChat;
  getLastInteracttion: () => number;
  init: () => Promise<void>;
  dispose: () => Promise<void>;
}

export enum AgentPlatform {
  OPENAI = "openai",
  WRITING_ASSISTANCE = "writing_assistance",
}

export interface WritingMessage {
  custom?: {
    suggestions?: string[];
    writingTask?: string;
    messageType?: "user_input" | "ai_response" | "system_message";
  };
}
