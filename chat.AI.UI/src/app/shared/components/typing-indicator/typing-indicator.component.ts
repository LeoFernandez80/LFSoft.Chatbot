import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="typing">
        <span></span><span></span><span></span>
      </div>
    }
  `,
  styles: [`
    .typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
    }
    .typing span {
      width: 7px; height: 7px;
      background: var(--text-muted);
      border-radius: 50%;
      animation: bounce 1.2s infinite;
    }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30%           { transform: translateY(-6px); }
    }
  `],
})
export class TypingIndicatorComponent {
  readonly visible = input.required<boolean>();
}
