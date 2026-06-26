import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  getHealth(): Observable<unknown> {
    return this.http.get(`${this.base}/api/health`);
  }

  getAdminStats(): Observable<unknown> {
    return this.http.get(`${this.base}/api/admin/stats`);
  }

  getQueueStats(): Observable<unknown> {
    return this.http.get(`${this.base}/api/queue/stats`);
  }

  getSession(sessionId: string): Observable<unknown> {
    return this.http.get(`${this.base}/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  getUserSessions(userId: string): Observable<unknown> {
    return this.http.get(`${this.base}/api/users/${encodeURIComponent(userId)}/sessions`);
  }

  getChatHistory(sessionId: string, limit: number, offset: number): Observable<unknown> {
    return this.http.get(
      `${this.base}/api/chat/history/${encodeURIComponent(sessionId)}?limit=${limit}&offset=${offset}`
    );
  }

  sendAsyncMessage(body: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/api/chat/message/async`, body);
  }

  cleanupSessions(): Observable<unknown> {
    return this.http.post(`${this.base}/api/admin/cleanup-sessions`, {});
  }
}
