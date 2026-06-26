import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@env/environment';

export type HealthStatus = 'unknown' | 'ok' | 'error';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  check(): Observable<HealthStatus> {
    return this.http.get(`${environment.apiBase}/api/health`, { observe: 'response' }).pipe(
      map(res => (res.ok ? 'ok' : 'error'))
    );
  }
}
