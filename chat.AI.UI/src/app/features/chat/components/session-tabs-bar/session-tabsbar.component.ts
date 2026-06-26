import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChatTab } from '@core/models/chat-tab.model';
import { SessionTabItemComponent } from '../session-tab-item/session-tabitem.component';

/**
 * DUMB component – the horizontal bar containing all session tabs + "New session" button.
 */
@Component({
  selector: 'app-session-tabs-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SessionTabItemComponent],
  templateUrl: './session-tabsbar.component.html',
  styleUrl: './session-tabsbar.component.scss',
})
export class SessionTabsBarComponent {
  readonly tabs        = input.required<ChatTab[]>();
  readonly activeTabId = input<string | null>(null);
  readonly addTab      = output<void>();
  readonly removeTab   = output<string>();
  readonly switchTab   = output<string>();
}
