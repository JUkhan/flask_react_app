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

  private dashboardState = new BehaviorSubject<DashboardState>({
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
}
