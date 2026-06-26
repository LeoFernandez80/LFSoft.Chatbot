import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-json-output',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data() !== null) {
      <pre
        class="json-output"
        [class.json-output--error]="isError()"
      >{{ formatted() }}</pre>
    }
  `,
  styles: [`
    .json-output {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--accent2);
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .json-output--error { color: #f88; }
  `],
})
export class JsonOutputComponent {
  readonly data    = input<unknown>(null);
  readonly isError = input<boolean>(false);

  formatted(): string {
    return JSON.stringify(this.data(), null, 2);
  }
}
