import { create } from 'zustand'
import { FrontendCustomerRecord, FrontendCallHistoryEntry } from '@/lib/types'

interface User {
  username: string
  display_name: string
  role?: string
}

interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void

  // Current list
  currentList: 'list1' | 'list2' | 'list3'
  setCurrentList: (listId: 'list1' | 'list2' | 'list3') => void

  // List data
  listData: {
    list1: FrontendCustomerRecord[]
    list2: FrontendCustomerRecord[]
    list3: FrontendCustomerRecord[]
  }
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

  // Current list
  currentList: 'list1',
  setCurrentList: (listId) => set({ currentList: listId, currentListIndex: 0 }),

  // List data
  listData: {
    list1: [],
    list2: [],
    list3: [],
  },
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
