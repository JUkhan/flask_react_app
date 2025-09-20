import { Component, OnInit, OnDestroy, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TableComponentComponent } from '../table-component/table-component.component';
import { LineChartComponent } from '../chart-components/line-chart/line-chart.component';
import { BarChartComponent } from '../chart-components/bar-chart/bar-chart.component';
import { PieChartComponent } from '../chart-components/pie-chart/pie-chart.component';
import { DashboardService, SComponent } from '../../services/dashboard.service';

interface ComponentType {
  type: string;
  name: string;
  icon?: string;
  defaultTitle: string;
}

@Component({
  selector: 'app-dashboard-container',
  standalone: true,
  imports: [CommonModule, FormsModule, TableComponentComponent, LineChartComponent, BarChartComponent, PieChartComponent],
  templateUrl: './dashboard-container.component.html',
  styleUrls: ['./dashboard-container.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardContainerComponent implements OnInit, OnDestroy {
  // Use signals for reactive state
  components = computed(() => this.dashboardService.components());
  showAddMenu = signal(false);
  componentTypes = signal<ComponentType[]>([]);
  editingComponent = signal<any>(null);
  editTitle = signal('');
  isAdding = computed(() => this.dashboardService.data().length > 0);
  editableComponentId = computed(() => this.dashboardService.editableComponentId());

  constructor(private dashboardService: DashboardService) {
    // Use effect to react to dashboard state changes
    effect(() => {
      const types = this.dashboardService.types();
      this.updateComponentTypes(types);
    }, { allowSignalWrites: true });

    // Track component changes for debugging
    effect(() => {
      const components = this.components();
      console.log('Dashboard container - Components updated:', components.map(c => ({
        id: c.id,
        isQueryEditable: c.isQueryEditable
      })));
    });
  }

  ngOnInit(): void {
    // Load existing dashboard data
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    // Cleanup if needed (effects are automatically cleaned up)
  }

  private loadDashboardData(): void {
    const userId = sessionStorage.getItem('userId') || '123';
    this.dashboardService.fetchDashboardData(userId).subscribe({
      next: (response) => {
        console.log('Fetched dashboard data:', response);
        if (response.data && response.data.length > 0) {
          const types = new Set<string>(response.data.map((component: any) => component.type));
          const processedData = response.data.map((component: any) => {
            // Ensure columns is an array
            if (typeof component.columns === 'string') {
              component.columns = component.columns.split(',').map((col: string) => col.trim());
            }
            // Ensure data and columns are always arrays
            component.data = component.data || [];
            component.columns = component.columns || [];
            return component;
          });
          this.dashboardService.setDashboardState({
            components: processedData,
            types: Array.from(types)
          });
        }
      },
      error: (error) => {
        console.error('Error fetching dashboard data:', error);
      }
    });
  }

  private updateComponentTypes(types: string[]): void {
    const newTypes = types.reduce((acc: ComponentType[], type) => {
      switch (type) {
        case 'line':
          acc.push({ type: 'line', name: 'Line Chart', defaultTitle: 'Line Chart' });
          break;
        case 'bar':
          acc.push({ type: 'bar', name: 'Bar Chart', defaultTitle: 'Bar Chart' });
          break;
        case 'pie':
          acc.push({ type: 'pie', name: 'Pie Chart', defaultTitle: 'Pie Chart' });
          break;
        case 'donut':
          acc.push({ type: 'donut', name: 'Donut Chart', defaultTitle: 'Donut Chart' });
          break;
        case 'table':
          acc.push({ type: 'table', name: 'Table', defaultTitle: 'Table' });
          break;
      }
      return acc;
    }, []);
    this.componentTypes.set(newTypes);
  }

  toggleAddMenu(): void {
    this.showAddMenu.update(value => !value);
  }

  closeAddMenu(): void {
    this.showAddMenu.set(false);
  }

  addComponent(type: string): void {
    const componentType = this.componentTypes().find(ct => ct.type === type);
    const dashboard = this.dashboardService.getDashboard();

    if (componentType && dashboard.columns.length > 0) {
      const newComponent: SComponent = {
        id: Number(new Date().getTime()),
        type: type as any,
        title: componentType.defaultTitle,
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
    this.closeAddMenu();
  }

  removeComponent(id: any): void {
    console.log('Removing component with ID:', id);
    const component = this.components().find(comp => comp.id === id);

    this.dashboardService.removeComponent(id);

    // Remove from server if it exists
    if (component && component.user_id) {
      this.dashboardService.deleteDashboardComponent(id).subscribe({
        next: () => {
          console.log('Component removed from server');
        },
        error: (error) => {
          console.error('Error removing component from server:', error);
        }
      });
    }
  }

  startEditing(id: any, currentTitle: string): void {
    this.editingComponent.set(id);
    this.editTitle.set(currentTitle);
  }

  saveEdit(): void {
    const component = this.components().find(comp => comp.id === this.editingComponent());
    if (component) {
      const updatedComponent = { ...component, title: this.editTitle() };
      this.dashboardService.updateComponent(updatedComponent);

      // Update on server
      if (component.user_id) {
        this.dashboardService.updateDashboardComponent(component.id, { title: this.editTitle() }).subscribe({
          next: (response) => {
            console.log('Component title updated:', response);
          },
          error: (error) => {
            console.error('Error updating component title:', error);
          }
        });
      }
    }
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingComponent.set(null);
    this.editTitle.set('');
  }

  handleColumnsChange(id: any, newColumns: string[]): void {
    const component = this.components().find(comp => comp.id === id);
    if (component) {
      const updatedComponent = { ...component, columns: newColumns };
      this.dashboardService.updateComponent(updatedComponent);

      // Update on server
      if (component.user_id) {
        this.dashboardService.updateDashboardComponent(id, { columns: newColumns.join(',') }).subscribe({
          next: (response) => {
            console.log('Component columns updated:', response);
          },
          error: (error) => {
            console.error('Error updating component columns:', error);
          }
        });
      }
    }
  }

  toggleQueryEditable(componentId: any): void {
    this.dashboardService.toggleQueryEditable(componentId);
  }
}
