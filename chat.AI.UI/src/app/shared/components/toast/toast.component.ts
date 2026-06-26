import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.current(); as msg) {
      <div
        class="toast"
        [class.toast--success]="msg.type === 'success'"
        [class.toast--error]="msg.type === 'error'"
        [class.toast--warning]="msg.type === 'warning'"
        (click)="toast.dismiss()"
      >
        {{ msg.text }}
      </div>
    }
  `,
  styles: [`
    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 0.85rem;
      z-index: 999;
      cursor: pointer;
      animation: slide-up 0.3s ease;
    }
    .toast--success { border-color: var(--success); color: var(--success); }
    .toast--error   { border-color: var(--error);   color: #f88; }
    .toast--warning { border-color: var(--warning);  color: var(--warning); }
    @keyframes slide-up {
      from { opacity: 0; transform: translateX(-50%) translateY(12px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `],
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
