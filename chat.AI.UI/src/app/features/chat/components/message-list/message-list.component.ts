import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ChatMessage } from '@core/models/message.model';
import { MessageBubbleComponent } from '../message-bubble/message-bubble.component';

/**
 * DUMB component – renders the scrollable list of messages.
 */
@Component({
  selector: 'app-message-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageBubbleComponent],
  template: `
    <div class="message-list" #scrollContainer>
      @for (msg of messages(); track $index) {
        <app-message-bubble
          [message]="msg"
          (quickReplySelected)="quickReplySelected.emit($event)"
        />
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .message-list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .message-list::-webkit-scrollbar       { width: 6px; }
    .message-list::-webkit-scrollbar-track { background: transparent; }
    .message-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    .message-list::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
  `],
})
export class MessageListComponent implements AfterViewChecked {
  readonly messages            = input.required<ChatMessage[]>();
  readonly quickReplySelected  = output<string>();

  private readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
