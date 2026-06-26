export type MessageRole = 'user' | 'bot' | 'system';

export interface QuickReply {
  label: string;
  value: string;
}

export interface ChatMessage {
  role:            MessageRole;
  content:         string;
  meta?:           string;
  quickReplies?:   QuickReply[];
  timestamp?:      Date;
  csvDownloadId?:  string;
}

// ── Factory helpers ───────────────────────────────────────────────────────────

export function createUserMessage(content: string): ChatMessage {
  return { role: 'user', content, timestamp: new Date(), meta: new Date().toLocaleTimeString() };
}

export function createBotMessage(content: string, meta?: string, quickReplies?: QuickReply[]): ChatMessage {
  return { role: 'bot', content, meta, quickReplies, timestamp: new Date() };
}

export function createSystemMessage(content: string): ChatMessage {
  return { role: 'system', content, timestamp: new Date() };
}
