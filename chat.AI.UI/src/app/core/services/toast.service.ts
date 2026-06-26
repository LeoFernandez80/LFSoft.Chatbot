import { Injectable, signal } from '@angular/core';
import { ToastMessage, ToastType } from '@core/models/toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _current = signal<ToastMessage | null>(null);
  private clearTimer?: ReturnType<typeof setTimeout>;

  readonly current = this._current.asReadonly();

  show(text: string, type: ToastType = 'success', durationMs = 2800): void {
    clearTimeout(this.clearTimer);
    this._current.set({ id: `${Date.now()}`, text, type });
    this.clearTimer = setTimeout(() => this._current.set(null), durationMs);
  }

  dismiss(): void {
    clearTimeout(this.clearTimer);
    this._current.set(null);
  }
}
