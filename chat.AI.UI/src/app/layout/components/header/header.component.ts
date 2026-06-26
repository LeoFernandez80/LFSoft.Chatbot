import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { HealthDotComponent } from '@shared/components/health-dot/health-dot.component';

export interface NavTab {
  label: string;
  route: string;
  icon:  string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, BadgeComponent, HealthDotComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly appName    = input<string>('Mandi.AI');
  readonly appVersion = input<string>('v2.0.0');
  readonly navTabs    = input<NavTab[]>([]);
}
