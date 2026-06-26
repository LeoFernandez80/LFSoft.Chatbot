import { ChatMessage } from './message.model';

export type ChannelType = 'web' | 'mobile' | 'api';
export type SendMode   = 'sync' | 'async';
export type Priority   = 'normal' | 'high' | 'low';

/** Configuration fields editable by the user in the sidebar */
export interface SessionConfig {
  label:    string;
  userId:   string;
  tenantId: string;
  channel:  ChannelType;
  mode:     SendMode;
  priority: Priority;
}

/** Full state of one chat tab */
export interface ChatTab extends SessionConfig {
  id:        string;
  sessionId: string | null;
  connected: boolean;
  messages:  ChatMessage[];
}

/** Build a fresh tab with sensible defaults */
export function createChatTab(counter: number): ChatTab {
  return {
    id:        `tab-${Date.now()}-${counter}`,
    label:     `Sesión ${counter}`,
    sessionId: null,
    connected: false,
    userId:    'user-123',
    tenantId:  'empresa-b',
    channel:   'web',
    mode:      'sync',
    priority:  'normal',
    messages:  [],
  };
}
