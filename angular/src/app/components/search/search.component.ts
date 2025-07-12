import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLTextAreaElement>;
  
  query = 'show unique transaction of sender name and amount';
  loading = false;

  constructor(private dashboardService: DashboardService) {}

  ngAfterViewInit(): void {
    // Auto focus on the search input
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  clearSearch(): void {
    this.query = '';
  }

  onEnterKey(event: any): void {
    if (event.shiftKey) {
      // Allow new line with Shift+Enter
      return;
    }
    // Prevent default Enter behavior and trigger search
    event.preventDefault();
    this.getData();
  }

  getData(): void {
    if (!this.query.trim()) return;
    
    this.loading = true;
    this.dashboardService.setTypesAndData([], [], '', []);
    
    this.dashboardService.getQueryResult(this.query)
      .subscribe({
        next: (data) => {
          console.log('Query result:', data);
          this.loading = false;
          this.dashboardService.takeDecision(data);
        },
        error: (error) => {
          console.error('Error fetching data:', error);
          this.loading = false;
        }
      });
  }
}
