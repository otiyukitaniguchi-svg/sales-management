import { create } from 'zustand'
import { FrontendCustomerRecord, FrontendCallHistoryEntry, ListDefinition } from '@/lib/types'

interface User {
  id?: string
  username: string
  display_name: string
  role?: string
}

interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void

  // Available lists (fetched dynamically, replaces the old hardcoded list1/2/3)
  lists: ListDefinition[]
  setLists: (lists: ListDefinition[]) => void

  // Current list
  currentList: string
  setCurrentList: (listId: string) => void

  // List data
  listData: Record<string, FrontendCustomerRecord[]>
  setListData: (listId: string, data: FrontendCustomerRecord[]) => void

  // Current record index
  currentListIndex: number
  setCurrentListIndex: (index: number) => void

  // Search mode
  isSearchMode: boolean
  searchResults: Array<{ listId: string; record: FrontendCustomerRecord }>
  searchResultIndex: number
  setSearchMode: (isSearch: boolean) => void
  setSearchResults: (results: Array<{ listId: string; record: FrontendCustomerRecord }>) => void
  updateSearchResultsOnly: (results: Array<{ listId: string; record: FrontendCustomerRecord }>) => void
  setSearchResultIndex: (index: number) => void

  // Loading state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Report mode
  isReportMode: boolean
  setIsReportMode: (isReport: boolean) => void

  // Current call (for call history input)
  currentCall: FrontendCallHistoryEntry
  setCurrentCall: (call: FrontendCallHistoryEntry) => void
  resetCurrentCall: () => void
}

const initialCallState: FrontendCallHistoryEntry = {
  date: '',
  startTime: '',
  endTime: '',
  responder: '',
  operator: '',
  gender: '',
  progress: '',
  note: '',
}

export const useAppStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),

  // Available lists
  lists: [],
  setLists: (lists) => set({ lists }),

  // Current list
  currentList: 'list1',
  setCurrentList: (listId) => set({ currentList: listId, currentListIndex: 0 }),

  // List data
  listData: {},
  setListData: (listId, data) =>
    set((state) => ({
      listData: {
        ...state.listData,
        [listId]: data,
      },
    })),

  // Current index
  currentListIndex: 0,
  setCurrentListIndex: (index) => set({ currentListIndex: index }),

  // Search
  isSearchMode: false,
  searchResults: [],
  searchResultIndex: 0,
  setSearchMode: (isSearch) => set({ isSearchMode: isSearch }),
  setSearchResults: (results) => set({ searchResults: results, searchResultIndex: 0 }),
  updateSearchResultsOnly: (results) => set({ searchResults: results }),
  setSearchResultIndex: (index) => set({ searchResultIndex: index }),

  // Loading
  isLoading: false,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),

  // Report
  isReportMode: false,
  setIsReportMode: (isReport) => set({ isReportMode: isReport }),

  // Current call
  currentCall: initialCallState,
  setCurrentCall: (call) => set({ currentCall: call }),
  resetCurrentCall: () => set({ currentCall: initialCallState }),
}))
