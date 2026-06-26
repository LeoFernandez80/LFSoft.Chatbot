import { computed, Injectable, signal } from '@angular/core';
import { ChatTab, createChatTab, SessionConfig } from '@core/models/chat-tab.model';
import { ChatMessage } from '@core/models/message.model';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  // ── Private mutable state ────────────────────────────────────────────────
  private readonly _tabs        = signal<ChatTab[]>([]);
  private readonly _activeTabId = signal<string | null>(null);
  private tabCounter = 0;

  // ── Public read-only signals ─────────────────────────────────────────────
  readonly tabs        = this._tabs.asReadonly();
  readonly activeTabId = this._activeTabId.asReadonly();
  readonly activeTab   = computed(() =>
    this._tabs().find(t => t.id === this._activeTabId()) ?? null
  );
  readonly hasActiveTabs = computed(() => this._tabs().length > 0);

  // ── Tab lifecycle ────────────────────────────────────────────────────────
  addTab(): ChatTab {
    this.tabCounter++;
    const tab = createChatTab(this.tabCounter);
    tab.messages = [];
    this._tabs.update(tabs => [...tabs, tab]);
    this._activeTabId.set(tab.id);
    return tab;
  }

  removeTab(id: string): void {
    const idx = this._tabs().findIndex(t => t.id === id);
    this._tabs.update(tabs => tabs.filter(t => t.id !== id));
    if (this._activeTabId() === id) {
      const remaining = this._tabs();
      if (remaining.length > 0) {
        const nextIdx = Math.max(0, Math.min(idx, remaining.length - 1));
        this._activeTabId.set(remaining[nextIdx].id);
      } else {
        this._activeTabId.set(null);
      }
    }
  }

  switchTab(id: string): void {
    this._activeTabId.set(id);
  }

  getTab(id: string): ChatTab | undefined {
    return this._tabs().find(t => t.id === id);
  }

  // ── Tab state mutations ──────────────────────────────────────────────────
  updateTab(id: string, patch: Partial<ChatTab>): void {
    this._tabs.update(tabs =>
      tabs.map(t => t.id === id ? { ...t, ...patch } : t)
    );
  }

  updateActiveTab(patch: Partial<ChatTab>): void {
    const id = this._activeTabId();
    if (id) this.updateTab(id, patch);
  }

  updateActiveTabConfig(config: Partial<SessionConfig>): void {
    this.updateActiveTab(config);
  }

  addMessageToTab(tabId: string, message: ChatMessage): void {
    this._tabs.update(tabs =>
      tabs.map(t =>
        t.id === tabId
          ? { ...t, messages: [...t.messages, message] }
          : t
      )
    );
  }

  addMessageToActiveTab(message: ChatMessage): void {
    const id = this._activeTabId();
    if (id) this.addMessageToTab(id, message);
  }
}
