import { Component, input, output, model, OnInit, ChangeDetectionStrategy, effect, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChartComponent implements OnInit {
  // Model signals for two-way binding
  readonly data = model<any[]>([]);
  readonly columns = model<string[]>([]);

  // Regular inputs
  readonly id = input<any>();
  readonly title = input<string>('Bar Chart');
  readonly query = input<string>();
  readonly type = input<string>();
  readonly isQueryEditable = input<boolean>();
  readonly json_config = input<any>();

  // Signal outputs
  readonly onRemove = output<any>();
  readonly onEdit = output<{ id: any, title: string }>();
  readonly onColumnsChange = output<string[]>();
  readonly onToggleQueryEditable = output<void>();

  private cdr = inject(ChangeDetectorRef);

  constructor(private dashboardService: DashboardService) {
    // React to data changes
    effect(() => {
      const data = this.data();
      const columns = this.columns();
      if (data || columns) {
        this.updateChartData();
      }
    });

    // Track isQueryEditable changes
    effect(() => {
      const editable = this.isQueryEditable();
      console.log(`Bar chart ${this.id()} - isQueryEditable changed to:`, editable);
      this.cdr.markForCheck();
    });

    // React to config changes
    effect(() => {
      const config = this.json_config();
      if (config?.chart) {
        this.applyChartConfig(config.chart);
        this.cdr.markForCheck();
      }
    });
  }
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
    const data = this.data();
    const query = this.query();
    if (data && data.length === 0 && query) {
      this.dashboardService.getQueryResult2(query).subscribe(res => {
        // Now we can update data since it's a model signal
        if (res.data) {
          this.data.set(res.data);
          this.updateChartData();
        }
      });
    }
  }

  private updateChartData(): void {
    const data = this.data();
    const columns = this.columns();

    if (!data || data.length === 0 || !columns || columns.length < 2) {
      return;
    }

    const labels = data.map(item => item[columns[0]]);
    const datasets = [];

    // For bar charts, we typically want to show one numeric column
    if (columns.length >= 2) {
      const column = columns[1]; // Use the second column as the value
      const values = data.map(item => {
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
    this.cdr.markForCheck();
  }

  handleRemove(): void {
    this.onRemove.emit(this.id());
  }

  handleEdit(): void {
    this.onEdit.emit({ id: this.id(), title: this.title() });
  }

  handleToggleQueryEditable(): void {
    console.log('Bar chart - Toggle query editable clicked, current state:', this.isQueryEditable());
    this.onToggleQueryEditable.emit();
  }

  private applyChartConfig(config: any): void {
    // Apply chart configuration options
    this.barChartOptions = {
      responsive: config.responsive !== false,
      maintainAspectRatio: config.maintainAspectRatio !== false,
      animation: config.animationEnabled !== false ? {
        duration: config.animationDuration || 1000,
        easing: config.animationEasing || 'easeOutQuad'
      } : false,
      scales: {
        x: {
          display: config.showXAxis !== false,
          grid: {
            display: config.showGrid !== false,
            color: config.gridColor || 'rgba(0, 0, 0, 0.1)'
          }
        },
        y: {
          display: config.showYAxis !== false,
          beginAtZero: config.beginAtZero !== false,
          grid: {
            display: config.showGrid !== false,
            color: config.gridColor || 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          display: config.showLegend !== false,
          position: config.legendPosition || 'top'
        },
        tooltip: {
          enabled: config.showTooltip !== false
        }
      }
    };

    this.updateChartData();
  }
}
