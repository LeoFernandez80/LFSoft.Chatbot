import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HttpMethod } from '@core/models/admin.model';

@Component({
  selector: 'app-method-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="method-badge" [class]="'method-badge--' + method().toLowerCase()">{{ method() }}</span>`,
  styles: [`
    .method-badge {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: var(--font-mono);
    }
    .method-badge--get    { background: #1a3a2a; color: #4caf50; }
    .method-badge--post   { background: #1a2a3a; color: #64b5f6; }
    .method-badge--put    { background: #2a2a1a; color: #ffb74d; }
    .method-badge--delete { background: #3a1a1a; color: #f88; }
    .method-badge--patch  { background: #2a1a3a; color: #ce93d8; }
  `],
})
export class MethodBadgeComponent {
  readonly method = input.required<HttpMethod>();
}
