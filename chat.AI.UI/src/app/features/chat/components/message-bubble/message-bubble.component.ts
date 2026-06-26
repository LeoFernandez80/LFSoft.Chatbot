import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ChatMessage, QuickReply } from '@core/models/message.model';
import { environment } from '@env/environment';

/**
 * DUMB component – renders a single message bubble.
 * Emits quickReplySelected when the user clicks a quick-reply chip.
 */
@Component({
  selector: 'app-message-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-bubble.component.html',
  styleUrl: './message-bubble.component.scss',
})
export class MessageBubbleComponent {
  readonly message             = input.required<ChatMessage>();
  readonly quickReplySelected  = output<string>();

  onQuickReply(value: string): void {
    this.quickReplySelected.emit(value);
  }

  normalizeQuickReplies(raw: Array<QuickReply | string>): QuickReply[] {
    return raw.map(item =>
      typeof item === 'string'
        ? { label: item, value: item }
        : item
    );
  }

  downloadCsv(): void {
    const id = this.message().csvDownloadId;
    if (!id) return;
    const url = `${environment.apiBase}/api/csv/${encodeURIComponent(id)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
