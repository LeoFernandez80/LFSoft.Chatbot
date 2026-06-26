import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CloseSessionRequest,
  CloseSessionResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageAsyncResponse,
  SendMessageRequest,
  SendMessageResponse,
} from '@core/models/session.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class SessionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  createSession(
    userId: string,
    tenantId: string,
    channel: string
  ): Observable<CreateSessionResponse> {
    const body: CreateSessionRequest = { userId, tenantId, channel };
    return this.http.post<CreateSessionResponse>(`${this.base}/api/sessions`, body);
  }

  closeSession(
    sessionId: string,
    reason: string
  ): Observable<CloseSessionResponse> {
    const body: CloseSessionRequest = { reason };
    return this.http.post<CloseSessionResponse>(
      `${this.base}/api/sessions/${encodeURIComponent(sessionId)}/close`,
      body
    );
  }

  sendMessage(body: SendMessageRequest): Observable<SendMessageResponse> {
    return this.http.post<SendMessageResponse>(`${this.base}/api/chat/message`, body);
  }

  sendMessageAsync(body: SendMessageRequest): Observable<SendMessageAsyncResponse> {
    return this.http.post<SendMessageAsyncResponse>(
      `${this.base}/api/chat/message/async`,
      body
    );
  }
}
