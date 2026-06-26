import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminCardConfig } from '@core/models/admin.model';
import { AdminApiService } from '@core/services/admin-api.service';
import { ToastService } from '@core/services/toast.service';
import { AdminCardComponent } from '../../components/admin-card/admin-card.component';
import { FormBuilder } from '@angular/forms';

interface CardResult {
  data:     unknown;
  hasError: boolean;
}

/**
 * SMART (container) component for the Admin & Debug section.
 */
@Component({
  selector: 'app-admin-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminCardComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly toast    = inject(ToastService);
  private readonly fb       = inject(FormBuilder);

  // ── Card definitions ──────────────────────────────────────────────────────
  readonly CARD_CONFIGS: AdminCardConfig[] = [
    { id: 'health',      title: 'Health Check',             method: 'GET',  endpoint: '/api/health' },
    { id: 'admin-stats', title: 'Estadísticas del sistema', method: 'GET',  endpoint: '/api/admin/stats' },
    { id: 'queue-stats', title: 'Estadísticas de colas',    method: 'GET',  endpoint: '/api/queue/stats' },
    {
      id: 'get-session', title: 'Obtener Sesión', method: 'GET', endpoint: '/api/sessions/:id',
      fields: [{ id: 'sessionId', label: 'Session ID', type: 'text', placeholder: 'sess-abc-123' }],
    },
    {
      id: 'user-sessions', title: 'Sesiones de usuario', method: 'GET', endpoint: '/api/users/:userId/sessions',
      fields: [{ id: 'userId', label: 'User ID', type: 'text', defaultValue: 'user-123' }],
    },
    {
      id: 'history', title: 'Historial de chat', method: 'GET', endpoint: '/api/chat/history/:sessionId',
      fields: [
        { id: 'sessionId', label: 'Session ID', type: 'text',   placeholder: 'sess-abc-123' },
        { id: 'limit',     label: 'Limit',      type: 'number', defaultValue: '20' },
        { id: 'offset',    label: 'Offset',     type: 'number', defaultValue: '0' },
      ],
    },
    {
      id: 'async-msg', title: 'Mensaje asíncrono', method: 'POST', endpoint: '/api/chat/message/async',
      fields: [
        { id: 'sessionId', label: 'Session ID', type: 'text', placeholder: 'sess-abc-123' },
        { id: 'userId',    label: 'User ID',    type: 'text', defaultValue: 'user-123' },
        { id: 'tenantId',  label: 'Tenant ID',  type: 'text', defaultValue: 'empresa-a' },
        { id: 'message',   label: 'Mensaje',    type: 'text', defaultValue: 'Hola, necesito ayuda' },
        { id: 'priority',  label: 'Prioridad',  type: 'text', defaultValue: 'normal' },
      ],
    },
    { id: 'cleanup', title: 'Limpiar sesiones expiradas', method: 'POST', endpoint: '/api/admin/cleanup-sessions', danger: true },
  ];

  // ── Per-card results ──────────────────────────────────────────────────────
  readonly results = signal<Record<string, CardResult>>({});

  // ── Dispatch execute per card ─────────────────────────────────────────────
  onExecute(cardId: string, params: Record<string, string | number>): void {
    const call$ = this.buildCall(cardId, params);
    if (!call$) return;

    call$.subscribe({
      next:  data       => this.setResult(cardId, data, false),
      error: (err: Error) => this.setResult(cardId, { error: err.message }, true),
    });
  }

  resultFor(cardId: string): unknown {
    return this.results()[cardId]?.data ?? null;
  }

  hasErrorFor(cardId: string): boolean {
    return this.results()[cardId]?.hasError ?? false;
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private setResult(cardId: string, data: unknown, hasError: boolean): void {
    this.results.update(r => ({ ...r, [cardId]: { data, hasError } }));
    if (!hasError && cardId === 'cleanup') {
      const count = (data as any)?.count;
      this.toast.show(`Limpieza completada${count != null ? `: ${count} sesiones` : ''}`, 'success');
    }
  }

  private buildCall(cardId: string, p: Record<string, string | number>) {
    switch (cardId) {
      case 'health':        return this.adminApi.getHealth();
      case 'admin-stats':   return this.adminApi.getAdminStats();
      case 'queue-stats':   return this.adminApi.getQueueStats();
      case 'get-session':   return p['sessionId'] ? this.adminApi.getSession(String(p['sessionId'])) : null;
      case 'user-sessions': return p['userId'] ? this.adminApi.getUserSessions(String(p['userId'])) : null;
      case 'history':       return p['sessionId'] ? this.adminApi.getChatHistory(String(p['sessionId']), Number(p['limit']), Number(p['offset'])) : null;
      case 'async-msg':
        return this.adminApi.sendAsyncMessage({
          sessionId: p['sessionId'], userId: p['userId'], tenantId: p['tenantId'],
          message: { content: p['message'], type: 'text' }, priority: p['priority'],
        });
      case 'cleanup': return this.adminApi.cleanupSessions();
      default: return null;
    }
  }
}
