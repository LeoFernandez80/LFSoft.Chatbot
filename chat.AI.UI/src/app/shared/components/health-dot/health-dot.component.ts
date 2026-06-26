import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HealthService, HealthStatus } from '@core/services/health.service';

@Component({
  selector: 'app-health-dot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="health-dot"
      [class.health-dot--ok]="status() === 'ok'"
      [class.health-dot--err]="status() === 'error'"
      title="Health check"
      (click)="refresh()"
    ></span>
  `,
  styles: [`
    .health-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--text-muted);
      cursor: pointer;
      transition: background 0.3s;
    }
    .health-dot--ok  { background: var(--success); box-shadow: 0 0 6px var(--success); }
    .health-dot--err { background: var(--error);   box-shadow: 0 0 6px var(--error); }
  `],
})
export class HealthDotComponent implements OnInit {
  private readonly healthService = inject(HealthService);
  readonly status = signal<HealthStatus>('unknown');

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.healthService.check().subscribe(s => this.status.set(s));
  }
}
