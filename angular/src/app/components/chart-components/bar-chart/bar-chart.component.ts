import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements OnInit, OnChanges {
  @Input() id?: any;
  @Input() title = 'Bar Chart';
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() query?: string;
  @Input() type?: string;
  @Output() onRemove = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<{ id: any, title: string }>();
  @Output() onColumnsChange = new EventEmitter<string[]>();

  constructor(private dashboardService: DashboardService) { }
  public barChartData: ChartConfiguration['data'] = {
    datasets: [],
    labels: []
  };

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: { display: true },
    }
  };

  public barChartType: ChartType = 'bar';

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

    // For bar charts, we typically want to show one numeric column
    if (this.columns.length >= 2) {
      const column = this.columns[1]; // Use the second column as the value
      const values = this.data.map(item => {
        const value = item[column];
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      });

      datasets.push({
        data: values,
        label: column,
        backgroundColor: this.dashboardService.generateColors(values.length, 0.6),
        borderColor: this.dashboardService.generateColors(values.length, 1),
        borderWidth: 1
      });
    }

    this.barChartData = {
      labels: labels,
      datasets: datasets
    };
    console.log('Bar Chart Data:', this.barChartData);
  }

  handleRemove(): void {
    this.onRemove.emit(this.id);
  }

  handleEdit(): void {
    this.onEdit.emit({ id: this.id, title: this.title });
  }
}
