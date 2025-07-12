import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, Message } from '../../services/chat.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  isOpen = false;
  messages: Message[] = [
    { id: 1, text: 'Hello! How can I help you today?', sender: 'bot', timestamp: new Date() },
  ];
  inputValue = '';
  isTyping = false;
  isLoading = false;

  constructor(
    private chatService: ChatService,
    private dashboardService: DashboardService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadChatHistory();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private loadChatHistory(): void {
    console.log('Loading chat history...');
    const userId = sessionStorage.getItem('userId') || '123';
    this.chatService.getBotMessages(userId).subscribe({
      next: (data) => {
        if (data.messages && data.messages.length > 0) {
          const initialMessages = data.messages.map((msg: any, index: number) => ({
            id: index + 1,
            text: msg.text,
            sender: msg.sender,
            hasSql: msg.sender === 'bot' ? (msg.text.startsWith('SELECT') || msg.text.startsWith('select')) : false,
            timestamp: new Date()
          }));
          this.messages = initialMessages;
        }
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
      }
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.router.url !== '/dashboard') {
      console.log('Redirecting to dashboard');
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  handleSendMessage(): void {
    if (this.inputValue.trim() === '') return;

    const newMessage: Message = {
      id: this.messages.length + 1,
      text: this.inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    this.messages.push(newMessage);
    const userInput = this.inputValue;
    this.inputValue = '';
    this.isTyping = true;

    // Send message to backend
    const threadId = sessionStorage.getItem('userId') || '123';
    this.chatService.sendMessage(userInput, threadId).subscribe({
      next: (data) => {
        console.log('Bot response:', data);
        this.dashboardService.takeDecision(data);

        const botResponse: Message = {
          id: this.messages.length + 1,
          text: data.query ? data.query : 'Your query description is not sufficient to generate a valid query.',
          sender: 'bot',
          hasSql: data.query ? (data.query.startsWith('SELECT') || data.query.startsWith('select')) : false,
          timestamp: new Date()
        };

        this.messages.push(botResponse);
        this.isTyping = false;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        const errorResponse: Message = {
          id: this.messages.length + 1,
          text: 'Sorry, I encountered an error. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        };
        this.messages.push(errorResponse);
        this.isTyping = false;
      }
    });
  }

  loadSqlData(sql: string): void {
    if (!sql) return;

    this.isLoading = true;
    this.chatService.executeQuery(sql).subscribe({
      next: (data) => {
        this.isLoading = false;
        data.query = sql;
        this.dashboardService.takeDecision(data);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error executing SQL:', error);
      }
    });
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleSendMessage();
    }
  }

  formatTime(date: Date): string {
    return formatDate(date, 'shortTime', 'en-US');
  }
}
