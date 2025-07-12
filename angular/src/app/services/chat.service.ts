import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  hasSql?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) { }

  getBotMessages(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/get-bot-messages/${userId}`);
  }

  sendMessage(userInput: string, threadId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/get-query-result`, {
      user_input: userInput,
      thread_id: threadId
    });
  }

  executeQuery(query: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/get-query-result2`, {
      query: query
    });
  }
}
