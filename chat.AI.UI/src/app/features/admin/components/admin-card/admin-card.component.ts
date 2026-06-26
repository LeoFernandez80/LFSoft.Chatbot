import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { AdminCardConfig } from '@core/models/admin.model';
import { JsonOutputComponent } from '@shared/components/json-output/json-output.component';
import { MethodBadgeComponent } from '@shared/components/method-badge/method-badge.component';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

/**
 * DUMB component – a single API endpoint card with optional input fields.
 * Receives config; emits execute event with current field values.
 */
@Component({
  selector: 'app-admin-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonOutputComponent, MethodBadgeComponent],
  templateUrl: './admin-card.component.html',
  styleUrl: './admin-card.component.scss',
})
export class AdminCardComponent {
  readonly cardConfig = input.required<AdminCardConfig>();
  readonly result     = input<unknown>(null);
  readonly hasError   = input<boolean>(false);
  readonly execute    = output<Record<string, string | number>>();

  private readonly fb = inject(FormBuilder);
  readonly form: FormGroup = this.fb.group({});

  constructor() {
    // Build form controls whenever the card config is set/changed
    effect(() => {
      const cfg = this.cardConfig();
      const controls: Record<string, string | number> = {};
      for (const field of cfg.fields ?? []) {
        controls[field.id] = field.defaultValue ?? '';
      }
      // Rebuild group to reflect new fields
      Object.keys(this.form.controls).forEach(k => this.form.removeControl(k));
      Object.entries(controls).forEach(([k, v]) => this.form.addControl(k, this.fb.control(v)));
    });
  }

  onExecute(): void {
    this.execute.emit(this.form.getRawValue());
  }
}
