// ── Request / Response shapes for Session API ─────────────────────────────────

export interface CreateSessionRequest {
  userId:   string;
  tenantId: string;
  channel:  string;
}

export interface CreateSessionResponse {
  sessionId: string;
  status:    string;
}

export interface CloseSessionRequest {
  reason: string;
}

export interface CloseSessionResponse {
  success: boolean;
}

export interface SendMessageRequest {
  sessionId: string;
  userId:    string;
  tenantId:  string;
  message:   { content: string; type: 'text' };
  metadata:  { channel: string };
  priority?: string;
}

export interface SendMessageResponse {
  message?: {
    content:       string;
    quickReplies?: Array<{ label: string; value: string } | string>;
  };
  metadata?: {
    intent?:         string;
    processingTime?: number;
  };
}

export interface SendMessageAsyncResponse {
  messageId: string;
  status:    string;
}
