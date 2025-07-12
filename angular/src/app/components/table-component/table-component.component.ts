import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { DashboardService } from '../../services/dashboard.service';
import { PagerComponent } from './pager.component';

@Component({
  selector: 'app-table-component',
  standalone: true,
  imports: [CommonModule, FormsModule, PagerComponent],
  templateUrl: './table-component.component.html',
  styleUrls: ['./table-component.component.css']
})
export class TableComponentComponent implements OnInit, OnChanges {
  @Input() id?: any;
  @Input() title = 'Table';
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() query?: string;
  @Input() type?: string;
  @Output() onRemove = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<{ id: any, title: string }>();
  @Output() onColumnsChange = new EventEmitter<string[]>();

  displayColumns: string[] = [];
  page = '';
  // Pagination properties
  currentPage = 1;
  pageSize = 3;
  pageSizeOptions = [3, 10, 25, 50];
  paginatedData: any[] = [];
  totalPages = 0;
  constructor(private dashboardService: DashboardService) { }
  // Drag and drop properties
  draggedColumnIndex: number | null = null;
  isDragging = false;

  ngOnInit(): void {
    this.updateDisplayColumns();
    if (this.data && this.data.length === 0) {
      this.dashboardService.getQueryResult2(this.query || '').subscribe(res => {
        this.data = res.data || [];
        this.updateDisplayColumns();
        this.updatePagination();
      })
    }
  }

  ngOnChanges(): void {
    this.updateDisplayColumns();
  }

  private updateDisplayColumns(): void {
    if (this.columns && this.columns.length > 0) {
      this.displayColumns = this.columns;
    } else if (this.data && this.data.length > 0) {
      this.displayColumns = Object.keys(this.data[0]);
    }
    this.updatePagination();
  }

  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.data.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    this.updatePaginatedData();
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    console.log(`Updating paginated data from index ${startIndex} to ${endIndex}`);
    this.paginatedData = this.data.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  handlePageChange(page: number): void {
    this.goToPage(page);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.pageSize = +this.pageSize;
    this.updatePagination();
  }

  min(a: number, b: number): number {
    return a < b ? a : b;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Drag and drop methods
  onDragStart(event: DragEvent, columnIndex: number): void {
    this.draggedColumnIndex = columnIndex;
    this.isDragging = true;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', event.target?.toString() || '');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, targetColumnIndex: number): void {
    event.preventDefault();

    if (this.draggedColumnIndex !== null && this.draggedColumnIndex !== targetColumnIndex) {
      const draggedColumn = this.displayColumns[this.draggedColumnIndex];
      const newColumns = [...this.displayColumns];

      // Remove the dragged column
      newColumns.splice(this.draggedColumnIndex, 1);

      // Insert at new position
      newColumns.splice(targetColumnIndex, 0, draggedColumn);

      this.displayColumns = newColumns;
      this.onColumnsChange.emit(this.displayColumns);
    }

    this.draggedColumnIndex = null;
    this.isDragging = false;
  }

  onDragEnd(): void {
    this.draggedColumnIndex = null;
    this.isDragging = false;
  }

  handleRemove(): void {
    this.onRemove.emit(this.id);
  }

  handleEdit(): void {
    this.onEdit.emit({ id: this.id, title: this.title });
  }

  getValueByKey(obj: any, key: string): any {
    return obj[key];
  }
}
