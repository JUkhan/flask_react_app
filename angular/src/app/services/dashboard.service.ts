import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SComponent {
  id: any;
  type: 'line' | 'bar' | 'pie' | 'table' | 'donut';
  title: string;
  query: string;
  data?: any[];
  columns?: string[];
  user_id?: any;
}

interface DashboardState {
  components: SComponent[];
  types: string[];
  data: any[];
  columns: string[];
  query: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = '/api';

  public dashboardState = new BehaviorSubject<DashboardState>({
    components: [],
    types: [],
    data: [],
    columns: [],
    query: ''
  });

  public dashboard$ = this.dashboardState.asObservable();

  constructor(private http: HttpClient) { }

  getDashboard(): DashboardState {
    return this.dashboardState.value;
  }

  setDashboardState(newState: Partial<DashboardState>): void {
    this.dashboardState.next({ ...this.dashboardState.value, ...newState });
  }

  addComponent(component: SComponent): void {
    const currentState = this.dashboardState.value;
    this.dashboardState.next({
      ...currentState,
      components: [component, ...currentState.components]
    });
  }

  removeComponent(id: any): void {
    const currentState = this.dashboardState.value;
    this.dashboardState.next({
      ...currentState,
      components: currentState.components.filter(comp => comp.id !== id)
    });
  }

  updateComponent(updatedComponent: SComponent): void {
    const currentState = this.dashboardState.value;
    this.dashboardState.next({
      ...currentState,
      components: currentState.components.map(comp =>
        comp.id === updatedComponent.id ? updatedComponent : comp
      )
    });
  }

  setTypesAndData(types: string[], data: any[], query: string, columns: string[]): void {
    const currentState = this.dashboardState.value;
    this.dashboardState.next({
      ...currentState,
      types,
      data,
      query,
      columns
    });
  }

  // API calls
  fetchDashboardData(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboards/${userId}`);
  }

  createDashboardComponent(component: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/dashboard`, component);
  }

  deleteDashboardComponent(componentId: any): Observable<any> {
    return this.http.delete(`${this.baseUrl}/dashboard/${componentId}`);
  }

  updateDashboardComponent(componentId: any, updates: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/dashboard/${componentId}`, updates);
  }

  getQueryResult(queryDescription: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/get-query-result`, { queryDescription });
  }

  getQueryResult2(query: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/get-query-result2`, { query });
  }

  takeDecision(response: { data: any[], query: string }): void {
    const { data, query } = response;

    // Handle empty data
    if (!data || data.length === 0) {
      console.warn('No data returned from the query.');
      this.setTypesAndData([], [], query, []);
      return;
    }

    // Get columns from first object
    let columns = Object.keys(data[0]);
    let namedColumn = '';
    const acc = columns.reduce((acc, col) => {
      if (typeof data[0][col] === 'string' ||
        (data[0][col] instanceof Date ||
          (typeof data[0][col] === 'string' && !isNaN(Date.parse(data[0][col]))))) {
        if (acc['string']) {
          acc['string'] += 1;
        } else {
          acc['string'] = 1;
          namedColumn = col;
        }
      } else if (typeof data[0][col] === 'number') {
        if (acc['number']) {
          acc['number'] += 1;
        } else {
          acc['number'] = 1;
        }
      } else {
        if (acc['unknown']) {
          acc['unknown'] += 1;
        } else {
          acc['unknown'] = 1;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    console.log('Columns:', acc);
    columns = columns.filter(col => col !== namedColumn);
    columns.unshift(namedColumn);

    if (acc['string'] > 1 || acc['unknown'] > 0) {
      this.setTypesAndData(['table'], data, query, columns);
    } else if (acc['number'] > 1) {
      this.setTypesAndData(['line', 'table'], data, query, columns);
    } else if (acc['number'] === 1) {
      this.setTypesAndData(['bar', 'pie', 'donut', 'line', 'table'], data, query, columns);
    } else {
      this.setTypesAndData(['table'], data, query, columns);
    }
  }
  public generateColors(count: number, alpha: number): string[] {
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

    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }
}
