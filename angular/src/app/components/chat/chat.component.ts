import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, Message } from '../../services/chat.service';
import { DashboardService, DashboardState } from '../../services/dashboard.service';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { Subscription } from 'rxjs';
import { LucideAngularModule, SignalHighIcon, Loader2Icon, BarChart3, TrendingUp, DonutIcon, PieChart, Grid3X3 } from 'lucide-angular';
import { TableComponentComponent } from '../table-component/table-component.component';
import { LineChartComponent } from '../chart-components/line-chart/line-chart.component';
import { BarChartComponent } from '../chart-components/bar-chart/bar-chart.component';
import { PieChartComponent } from '../chart-components/pie-chart/pie-chart.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  isOpen = false;
  messages: Message[] = [
    { id: 1, text: 'Hello! How can I help you today?', sender: 'bot', timestamp: new Date() },
  ];
  inputValue = '';
  isTyping = false;
  isLoading = false;
  preventScroll = false;
  private transcriptSubscription: Subscription;
  private errorSubscription: Subscription;
  dashboardState = signal<DashboardState>({
    components: [],
    query: '',
    data: [],
    columns: [],
    types: [],
    error: null
  });
  components = computed(() => {
    return this.dashboardState().types.map((type: string) => {
      switch (type) {
        case 'bar': return { type: 'bar', icon: BarChart3, name: 'Bar Chart', component: BarChartComponent };
        case 'line': return { type: 'line', icon: TrendingUp, name: 'Line Chart', component: LineChartComponent };
        case 'pie': return { type: 'pie', icon: PieChart, name: 'Pie Chart', component: PieChartComponent };
        case 'donut': return { type: 'donut', icon: DonutIcon, name: 'Donut Chart', component: PieChartComponent };
        case 'table': return { type: 'table', icon: Grid3X3, name: 'Table', component: TableComponentComponent };
        default: return { type: 'unknown', icon: BarChart3, name: 'Unknown', component: null };
      }
    })
  });
  error = computed(() => this.dashboardState().error);
  

  query: string = '';

  constructor(
    private chatService: ChatService,
    private dashboardService: DashboardService,
    private router: Router,
    public speechRecognitionService: SpeechRecognitionService
  ) {
    this.transcriptSubscription = this.speechRecognitionService.transcript$.subscribe(
      transcript => {
        this.inputValue = transcript;
      }
    );
    this.errorSubscription = this.speechRecognitionService.error$.subscribe(
      error => {
        console.error(error);
      }
    );
  }

  ngOnInit(): void {
    this.loadChatHistory();
    this.dashboardService.dashboardState.subscribe(state => {
      this.dashboardState.set(state);
      this.query = state.query;
    });
  }

  ngAfterViewChecked(): void {
    if (!this.preventScroll) {
      this.scrollToBottom();
    }
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
    this.preventScroll = false;

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
        this.dashboardService.takeDecision(error);
        this.isTyping = false;
      }
    });
  }

  loadSqlData(sql: string): void {
    if (!sql) return;

    this.isLoading = true;
    this.preventScroll = true;
    this.chatService.executeQuery(sql).subscribe({
      next: (data) => {
        this.isLoading = false;
        data.query = sql;
        this.dashboardService.takeDecision(data);
      },
      error: (error) => {
        this.isLoading = false;
        error.query = sql;
        this.dashboardService.takeDecision(error);
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

  toggleListening() {
    if (this.speechRecognitionService.isListening) {
      this.speechRecognitionService.stop();
    } else {
      this.speechRecognitionService.start();
    }
  }

  addComponent(type: string): void {
    console.log('Adding component of type:', type);
    const componentType = this.components().find((ct: any) => ct.type === type);
    const dashboard = this.dashboardService.getDashboard();
    if (componentType && dashboard.columns.length > 0) {
      const newComponent = {
        id: Number(new Date().getTime()),
        type: type as any,
        title: componentType.name,
        query: dashboard.query || '',
        data: dashboard.data,
        columns: dashboard.columns,
        user_id: sessionStorage.getItem('userId') || ''
      };

      console.log('Adding new component:', newComponent);
      this.dashboardService.addComponent(newComponent);

      // Save to server if user is logged in
      if (newComponent.user_id) {
        const serverComponent = { ...newComponent };
        (serverComponent as any).columns = (serverComponent.columns || []).join(',');
        delete (serverComponent as any).data;

        this.dashboardService.createDashboardComponent(serverComponent).subscribe({
          next: (response) => {
            console.log('Component saved to server:', response);
            // Update the component with server-generated ID
            const updatedComponent = { ...newComponent, id: response.dashboard.id };
            this.dashboardService.removeComponent(newComponent.id);
            this.dashboardService.addComponent(updatedComponent);
          },
          error: (error) => {
            console.error('Error saving component:', error);
          }
        });
      }
    }
  }
  ngOnDestroy() {
    this.transcriptSubscription.unsubscribe();
    this.errorSubscription.unsubscribe();
  }
}
