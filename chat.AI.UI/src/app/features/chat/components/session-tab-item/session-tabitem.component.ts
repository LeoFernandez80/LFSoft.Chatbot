import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChatTab } from '@core/models/chat-tab.model';

/**
 * DUMB component – renders a single tab button in the session tab bar.
 */
@Component({
  selector: 'app-session-tab-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="session-tab"
      [class.session-tab--active]="isActive()"
      (click)="tabClick.emit(tab().id)"
    >
      <span
        class="session-tab__dot"
        [class.session-tab__dot--connected]="tab().connected"
      ></span>
      <span class="session-tab__label">{{ tab().label }}</span>
      <button
        class="session-tab__close"
        title="Cerrar sesión"
        (click)="closeClick.emit(tab().id); $event.stopPropagation()"
      >✕</button>
    </button>
  `,
  styles: [`
    .session-tab {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 14px;
      border: 1px solid transparent;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      font-size: 0.82rem;
      color: var(--text-muted);
      background: transparent;
      white-space: nowrap;
      transition: all 0.15s;
      flex-shrink: 0;
      margin-top: 4px;
      font-family: var(--font-family);
    }
    .session-tab:hover { background: var(--surface2); color: var(--text); }
    .session-tab--active {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border);
      border-bottom-color: var(--surface);
      margin-bottom: -1px;
    }
    .session-tab__dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--text-muted);
      flex-shrink: 0;
    }
    .session-tab__dot--connected { background: var(--success); }
    .session-tab__close {
      width: 16px; height: 16px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8rem;
      display: flex; align-items: center; justify-content: center;
      padding: 0;
      transition: background 0.15s, color 0.15s;
    }
    .session-tab__close:hover { background: #3a1a1a; color: #f88; }
  `],
})
export class SessionTabItemComponent {
  readonly tab        = input.required<ChatTab>();
  readonly isActive   = input<boolean>(false);
  readonly tabClick   = output<string>();
  readonly closeClick = output<string>();
}
