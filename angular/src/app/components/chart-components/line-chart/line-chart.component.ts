import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css']
})
export class LineChartComponent implements OnInit, OnChanges {
  @Input() id?: any;
  @Input() title = 'Line Chart';
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() query?: string;
  @Input() type?: string;
  @Output() onRemove = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<{ id: any, title: string }>();
  @Output() onColumnsChange = new EventEmitter<string[]>();

  constructor(private dashboardService: DashboardService) { }
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [],
    labels: []
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    elements: {
      line: {
        tension: 0.5
      }
    },
    scales: {
      y: {
        position: 'left',
      }
    },
    plugins: {
      legend: { display: true },
    }
  };

  public lineChartType: ChartType = 'line';

  ngOnInit(): void {

    this.updateChartData();
    if (this.data && this.data.length === 0) {
      this.dashboardService.getQueryResult2(this.query || '').subscribe(res => {
        this.data = res.data || [];
        this.updateChartData();
      })
    }
  }

  ngOnChanges(): void {
    this.updateChartData();
  }

  private updateChartData(): void {
    if (!this.data || this.data.length === 0 || !this.columns || this.columns.length < 2) {
      return;
    }

    const labels = this.data.map(item => item[this.columns[0]]);
    const datasets = [];

    // Create datasets for numeric columns
    for (let i = 1; i < this.columns.length; i++) {
      const column = this.columns[i];
      const values = this.data.map(item => {
        const value = item[column];
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      });

      datasets.push({
        data: values,
        label: column,
        backgroundColor: this.getColor(i - 1, 0.2),
        borderColor: this.getColor(i - 1, 1),
        pointBackgroundColor: this.getColor(i - 1, 1),
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: this.getColor(i - 1, 0.8)
      });
    }

    this.lineChartData = {
      labels: labels,
      datasets: datasets
    };
  }

  private getColor(index: number, alpha: number): string {
    const baseColors = [
      `rgba(54, 162, 235, ${alpha})`,   // Blue
      `rgba(255, 99, 132, ${alpha})`,   // Red
      `rgba(255, 205, 86, ${alpha})`,   // Yellow
      `rgba(75, 192, 192, ${alpha})`,   // Green
      `rgba(153, 102, 255, ${alpha})`,  // Purple
      `rgba(255, 159, 64, ${alpha})`,   // Orange
      `rgba(255, 20, 147, ${alpha})`,   // Deep Pink
      `rgba(0, 191, 255, ${alpha})`,    // Deep Sky Blue
      `rgba(50, 205, 50, ${alpha})`,    // Lime Green
      `rgba(255, 140, 0, ${alpha})`,    // Dark Orange
      `rgba(147, 112, 219, ${alpha})`,  // Medium Purple
      `rgba(255, 69, 0, ${alpha})`,     // Red Orange
      `rgba(0, 255, 255, ${alpha})`,    // Cyan
      `rgba(255, 192, 203, ${alpha})`,  // Pink
      `rgba(124, 252, 0, ${alpha})`,    // Lawn Green
      `rgba(255, 0, 255, ${alpha})`,    // Magenta
      `rgba(255, 215, 0, ${alpha})`,    // Gold
      `rgba(64, 224, 208, ${alpha})`,   // Turquoise
      `rgba(255, 105, 180, ${alpha})`,  // Hot Pink
      `rgba(32, 178, 170, ${alpha})`,   // Light Sea Green
      `rgba(255, 99, 71, ${alpha})`,    // Tomato
      `rgba(138, 43, 226, ${alpha})`,   // Blue Violet
      `rgba(255, 127, 80, ${alpha})`,   // Coral
      `rgba(0, 128, 128, ${alpha})`,    // Teal
      `rgba(255, 182, 193, ${alpha})`,  // Light Pink
      `rgba(72, 61, 139, ${alpha})`     // Dark Slate Blue
    ];
    return baseColors[index % baseColors.length];
  }

  handleRemove(): void {
    this.onRemove.emit(this.id);
  }

  handleEdit(): void {
    this.onEdit.emit({ id: this.id, title: this.title });
  }
}
