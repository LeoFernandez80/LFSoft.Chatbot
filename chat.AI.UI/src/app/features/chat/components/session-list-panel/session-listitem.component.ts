import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChatTab } from '@core/models/chat-tab.model';

/**
 * DUMB component – a single row in the collapsible session list.
 */
@Component({
  selector: 'app-session-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="session-item"
      [class.session-item--active]="isActive()"
      [title]="collapsed() ? tab().label : ''"
      (click)="tabClick.emit(tab().id)"
    >
      <!-- Status dot / avatar -->
      <span
        class="session-item__dot"
        [class.session-item__dot--connected]="tab().connected"
        [class.session-item__dot--loading]="!tab().sessionId"
      ></span>

      <!-- Label (hidden when collapsed) -->
      @if (!collapsed()) {
        <span class="session-item__label">{{ tab().label }}</span>
        <!-- Close -->
        <button
          class="session-item__close"
          title="Cerrar"
          (click)="closeClick.emit(tab().id); $event.stopPropagation()"
        >✕</button>
      }
    </button>
  `,
  styles: [`
    .session-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      font-family: var(--font-family);
      text-align: left;
      transition: background 0.15s, color 0.15s;
      min-width: 0;
    }
    .session-item:hover       { background: var(--surface2); color: var(--text); }
    .session-item--active     { background: rgba(108,99,255,.15); color: var(--text); }
    .session-item__dot {
      width: 9px; height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--text-muted);
      transition: background 0.2s;
    }
    .session-item__dot--connected { background: var(--success); box-shadow: 0 0 5px var(--success); }
    .session-item__dot--loading   { background: var(--warning); animation: pulse 1.4s infinite; }
    .session-item__label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .session-item__close {
      flex-shrink: 0;
      width: 18px; height: 18px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.75rem;
      display: flex; align-items: center; justify-content: center;
      padding: 0;
      opacity: 0;
      transition: opacity 0.15s, background 0.15s, color 0.15s;
    }
    .session-item:hover .session-item__close { opacity: 1; }
    .session-item__close:hover { background: #3a1a1a; color: #f88; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
  `],
})
export class SessionListItemComponent {
  readonly tab        = input.required<ChatTab>();
  readonly isActive   = input<boolean>(false);
  readonly collapsed  = input<boolean>(false);
  readonly tabClick   = output<string>();
  readonly closeClick = output<string>();
}
