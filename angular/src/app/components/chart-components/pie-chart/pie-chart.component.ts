import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.css']
})
export class PieChartComponent implements OnInit, OnChanges {
  @Input() id?: any;
  @Input() title = 'Pie Chart';
  @Input() data: any[] = [];
  @Input() columns: string[] = [];
  @Input() query?: string;
  @Input() type?: string;
  @Output() onRemove = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<{ id: any, title: string }>();
  @Output() onColumnsChange = new EventEmitter<string[]>();

  constructor(private dashboardService: DashboardService) { }
  public pieChartData: ChartConfiguration['data'] = {
    datasets: [],
    labels: []
  };

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      }
    }
  };

  public pieChartType: ChartType = 'pie';

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

    // For pie charts, use first column as labels and second column as values
    const labels = this.data.map(item => item[this.columns[0]]);
    const values = this.data.map(item => {
      const value = item[this.columns[1]];
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    });

    this.pieChartData = {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: this.dashboardService.generateColors(values.length, 0.7),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    };

    // For donut chart
    if (this.type === 'donut') {
      this.pieChartType = 'doughnut';
    }
  }



  handleRemove(): void {
    this.onRemove.emit(this.id);
  }

  handleEdit(): void {
    this.onEdit.emit({ id: this.id, title: this.title });
  }
}
