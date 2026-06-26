import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <p class="empty-state__message">{{ message() }}</p>
      @if (actionLabel()) {
        <button class="btn btn--primary" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; }
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: var(--text-muted);
    }
    .empty-state__message { font-size: 0.9rem; }
  `],
})
export class EmptyStateComponent {
  readonly message     = input<string>('No hay contenido disponible');
  readonly actionLabel = input<string>('');
  readonly action      = output<void>();
}
