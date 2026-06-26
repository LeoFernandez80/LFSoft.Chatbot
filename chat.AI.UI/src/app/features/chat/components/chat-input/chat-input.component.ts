import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * DUMB component – textarea + send button at the bottom of the chat.
 */
@Component({
  selector: 'app-chat-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss',
})
export class ChatInputComponent {
  readonly disabled     = input<boolean>(false);
  readonly sendMessage  = output<string>();

  text = '';

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.text = textarea.value;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  submit(): void {
    const trimmed = this.text.trim();
    if (!trimmed || this.disabled()) return;
    this.sendMessage.emit(trimmed);
    this.text = '';
  }
}
