import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { ChatTab } from '@core/models/chat-tab.model';
import { SessionListItemComponent } from './session-listitem.component';

/**
 * DUMB component – vertical collapsible panel listing all open sessions.
 * Collapses to a slim icon strip; expands to show labels and controls.
 */
@Component({
  selector: 'app-session-list-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SessionListItemComponent],
  templateUrl: './session-listpanel.component.html',
  styleUrl: './session-listpanel.component.scss',
})
export class SessionListPanelComponent {
  readonly tabs        = input.required<ChatTab[]>();
  readonly activeTabId = input<string | null>(null);

  readonly addTab    = output<void>();
  readonly removeTab = output<string>();
  readonly switchTab = output<string>();

  readonly collapsed = signal(false);

  toggle(): void {
    this.collapsed.update(v => !v);
  }
}
