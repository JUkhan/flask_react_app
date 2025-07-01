import { Store, useStore } from '@tanstack/react-store'

// You can instantiate the store outside of React components too!
export const store = new Store({
  video: '',
  image: '',
  refresh: false,
  uploaded: false,
})
export const useAppStore = () => {
  return useStore(store)
}

export const setState = (newState: Partial<typeof store.state>) => {
  store.setState((prev) => ({ ...prev, ...newState }))
}
