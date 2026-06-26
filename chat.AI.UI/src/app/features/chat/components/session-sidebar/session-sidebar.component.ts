import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ChatTab, SessionConfig } from '@core/models/chat-tab.model';

/**
 * DUMB component – sidebar form to configure the active session.
 * Receives current tab state via inputs and emits change events upward.
 */
@Component({
  selector: 'app-session-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './sessionsidebar.component.html',
  styleUrl: './sessionsidebar.component.scss',
})
export class SessionSidebarComponent {
  // ── Inputs ───────────────────────────────────────────────────────────────
  readonly tab         = input.required<ChatTab>();
  readonly showActions = input<boolean>(true);

  // ── Outputs ──────────────────────────────────────────────────────────────
  readonly configChange  = output<Partial<SessionConfig>>();
  readonly closeSession  = output<void>();

  // ── Internal form ────────────────────────────────────────────────────────
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    label:    [''],
    userId:   [''],
    tenantId: [''],
    channel:  ['web'    as SessionConfig['channel']],
    mode:     ['sync'   as SessionConfig['mode']],
    priority: ['normal' as SessionConfig['priority']],
  });

  constructor() {
    // Sync form whenever the active tab changes (tab switch or external update)
    effect(() => {
      const t = this.tab();
      this.form.patchValue(
        { label: t.label, userId: t.userId, tenantId: t.tenantId,
          channel: t.channel, mode: t.mode, priority: t.priority },
        { emitEvent: false }
      );
    });
  }

  onBlur(): void {
    this.configChange.emit(this.form.getRawValue());
  }

  onCloseSession(): void {
    this.closeSession.emit();
  }
}
