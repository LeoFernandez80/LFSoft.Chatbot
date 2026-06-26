import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge">{{ text() }}</span>`,
  styles: [`
    .badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      opacity: 0.85;
    }
  `],
})
export class BadgeComponent {
  readonly text = input.required<string>();
}
