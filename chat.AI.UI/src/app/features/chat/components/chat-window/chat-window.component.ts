import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChatMessage } from '@core/models/message.model';
import { MessageListComponent } from '../message-list/message-list.component';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { TypingIndicatorComponent } from '@shared/components/typing-indicator/typing-indicator.component';

/**
 * DUMB component – composes the right-hand chat panel:
 * messages list + typing indicator + input bar.
 */
@Component({
  selector: 'app-chat-window',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MessageListComponent, ChatInputComponent, TypingIndicatorComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent {
  readonly messages    = input.required<ChatMessage[]>();
  readonly connected   = input<boolean>(false);
  readonly isTyping    = input<boolean>(false);
  readonly sendMessage = output<string>();
}
