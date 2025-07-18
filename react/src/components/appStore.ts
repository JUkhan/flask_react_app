import { Store, useStore } from '@tanstack/react-store'

// You can instantiate the store outside of React components too!
export const store = new Store({
  video: '',
  image: '',
  refresh: false,
  uploaded: false,
  userId: '',
})
export const useAppStore = () => {
  return useStore(store)
}

export const setState = (newState: Partial<typeof store.state>) => {
  store.setState((prev) => ({ ...prev, ...newState }))
}
export type SComponent = {
  id: any; // Optional ID for the component
  type: 'line' | 'bar' | 'pie' | 'table';
  title: string;
  query: string;
  data?: any[];
  columns?: string[];
  user_id?: any; // Optional user ID for the component
}

interface DashboardState {
  components: SComponent[];
  types: string[];
  data: any[];
  columns: string[];
  query: string;
  error: string;
}
const dashboard = new Store<DashboardState>({
  components: [],
  types: [],
  data: [],
  columns: [],
  query: '',
  error: ''
})

export const useDashboardStore = () => {
  return useStore(dashboard)
}

export const setDashboardState = (newState: Partial<typeof dashboard.state>) => {
  dashboard.setState((prev) => ({ ...prev, ...newState }))
}

export const addComponentState = (component: SComponent) => {
  dashboard.setState((prev) => ({
    ...prev,
    components: [component, ...prev.components]
  }))
}
export const removeComponentState = (id: string) => {
  dashboard.setState((prev) => ({
    ...prev,
    components: prev.components.filter((it) => it.id !== id)
  }))
}
export const updateComponentState = (updatedComponent: SComponent) => {
  dashboard.setState((prev) => ({
    ...prev,
    components: prev.components.map((comp, i) => (updatedComponent.id === comp.id ? updatedComponent : comp))
  }))
}

export const setTypesAndData = (types: string[], data: any[], query: string, columns: string[], error = '') => {
  dashboard.setState((prev) => ({
    ...prev,
    types, data, query, columns, error
  }))
}

