import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ChatStateService } from '@core/services/chat-state.service';
import { SessionApiService } from '@core/services/session-api.service';
import { ToastService } from '@core/services/toast.service';
import { SessionConfig } from '@core/models/chat-tab.model';
import { SendMessageRequest } from '@core/models/session.model';
import {
  createBotMessage,
  createSystemMessage,
  createUserMessage,
  QuickReply,
} from '@core/models/message.model';
import { SessionListPanelComponent } from '../../components/session-list-panel/session-listpanel.component';
import { SessionSidebarComponent } from '../../components/session-sidebar/session-sidebar.component';
import { ChatWindowComponent } from '../../components/chat-window/chat-window.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

/**
 * SMART (container) component for the Chat feature.
 * Orchestrates state and API calls; delegates all rendering to dumb components.
 */
@Component({
  selector: 'app-chat-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SessionListPanelComponent,
    SessionSidebarComponent,
    ChatWindowComponent,
    EmptyStateComponent,
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent {
  // ── Services ─────────────────────────────────────────────────────────────
  protected readonly state      = inject(ChatStateService);
  private readonly sessionApi   = inject(SessionApiService);
  private readonly toast        = inject(ToastService);

  // ── Local UI state ────────────────────────────────────────────────────────
  readonly isTyping   = signal(false);
  readonly configOpen = signal(false);

  openConfig():  void { this.configOpen.set(true);  }
  closeConfig(): void { this.configOpen.set(false); }

  // ── Computed shortcuts (exposed to template) ──────────────────────────────
  readonly tabs        = this.state.tabs;
  readonly activeTabId = this.state.activeTabId;
  readonly activeTab   = this.state.activeTab;
  readonly hasTabs     = this.state.hasActiveTabs;

  // ── Tab management ────────────────────────────────────────────────────────
  onAddTab(): void {
    const tab = this.state.addTab();
    this.createSessionForTab(tab.id);
  }

  private createSessionForTab(tabId: string): void {
    const tab = this.state.getTab(tabId);
    if (!tab) return;

    this.sessionApi.createSession(tab.userId, tab.tenantId, tab.channel).subscribe({
      next: response => {
        this.state.updateTab(tabId, { sessionId: response.sessionId, connected: true });
        this.state.addMessageToTab(
          tabId,
          createSystemMessage(`Sesión iniciada · ${response.sessionId.slice(0, 16)}…`)
        );
        this.toast.show('Sesión creada correctamente', 'success');
      },
      error: (err: Error) => {
        this.state.addMessageToTab(tabId, createSystemMessage(`⚠ No se pudo crear sesión: ${err.message}`));
        this.toast.show(`Error al crear sesión: ${err.message}`, 'error');
      },
    });
  }

  onSwitchTab(tabId: string): void {
    this.state.switchTab(tabId);
  }

  onRemoveTab(tabId: string): void {
    const tab = this.state.getTab(tabId);
    if (tab?.sessionId) {
      this.sessionApi
        .closeSession(tab.sessionId, 'user_ended')
        .subscribe({ error: () => {} }); // silent close on tab removal
    }
    this.state.removeTab(tabId);
  }

  // ── Session config ────────────────────────────────────────────────────────
  onConfigChange(config: Partial<SessionConfig>): void {
    this.state.updateActiveTab(config);
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────
  onCloseSession(): void {
    const tab = this.state.activeTab();
    if (!tab?.sessionId) return;

    this.sessionApi.closeSession(tab.sessionId, 'user_ended').subscribe({
      next: () => {
        this.state.updateActiveTab({ connected: false });
        this.state.addMessageToActiveTab(createSystemMessage('Sesión cerrada'));
        this.toast.show('Sesión cerrada', 'success');
      },
      error: (err: Error) => this.toast.show(`Error: ${err.message}`, 'error'),
    });
  }

  // ── Messaging ─────────────────────────────────────────────────────────────
  onSendMessage(text: string): void {
    const tab = this.state.activeTab();
    if (!tab?.sessionId) {
      this.toast.show('Primero iniciá una sesión', 'error');
      return;
    }

    this.state.addMessageToActiveTab(createUserMessage(text));
    this.isTyping.set(true);

    const body: SendMessageRequest = {
      sessionId: tab.sessionId,
      userId:    tab.userId,
      tenantId:  tab.tenantId,
      message:   { content: text, type: 'text' },
      metadata:  { channel: tab.channel },
      priority:  tab.priority,
    };

    const call$ =
      tab.mode === 'async'
        ? this.sessionApi.sendMessageAsync(body)
        : this.sessionApi.sendMessage(body);

    (call$ as import('rxjs').Observable<any>).subscribe({
      next: (response: any) => {
        this.isTyping.set(false);

        if (tab.mode === 'async') {
          this.state.addMessageToActiveTab(
            createSystemMessage(`Mensaje en cola · ID: ${response.messageId} · ${response.status}`)
          );
        } else {
          const content     = response.message?.content ?? JSON.stringify(response);
          const rawReplies: Array<QuickReply | string> = response.message?.quickReplies ?? [];
          const quickReplies: QuickReply[] = rawReplies.map((r: QuickReply | string) =>
            typeof r === 'string' ? { label: r, value: r } : r
          );
          const intent   = response.metadata?.intent;
          const procTime = response.metadata?.processingTime;
          const meta     = [intent && `intent: ${intent}`, procTime && `${procTime}ms`]
            .filter(Boolean).join(' · ');

          // Buscar adjunto CSV en la respuesta
          const csvAttachment  = (response.message?.attachments ?? [])
            .find((a: any) => a.type === 'csv');
          const csvDownloadId: string | undefined = csvAttachment?.id;

          this.state.addMessageToActiveTab(
            {
              ...createBotMessage(content, meta || undefined, quickReplies.length ? quickReplies : undefined),
              ...(csvDownloadId ? { csvDownloadId } : {})
            }
          );
        }
      },
      error: (err: Error) => {
        this.isTyping.set(false);
        this.state.addMessageToActiveTab(createSystemMessage(`⚠ Error: ${err.message}`));
      },
    });
  }
}
