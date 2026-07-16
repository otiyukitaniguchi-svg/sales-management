import { FrontendCustomerRecord, FrontendCallHistoryEntry, ApiResponse, LoginResponse, User, ListDefinition, VisitResultFeedEntry } from './types'

const API_BASE = '/api'

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:unauthorized'))
  }
  return response
}

export class ApiClient {
  /**
   * Fetch list data
   */
  static async getListData(listId: string): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}`)
    return response.json()
  }

  /**
   * Fetch call history for a specific record
   */
  static async getCallHistory(listId: string, no: string): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}/history/${no}`)
    return response.json()
  }

  /**
   * Update customer record
   */
  static async updateCustomer(
    listId: string,
    no: string,
    record: FrontendCustomerRecord
  ): Promise<boolean> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}/update/${no}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: record,
      }),
    })
    const result = await response.json()
    return result.success
  }

  /**
   * Create call history entry
   */
  static async createCallHistory(
    listId: string,
    no: string,
    entry: FrontendCallHistoryEntry
  ): Promise<boolean> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}/history/${no}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    })
    const result = await response.json()
    return result.success
  }

  /**
   * Update call history entry
   */
  static async updateCallHistory(
    listId: string,
    no: string,
    index: number,
    entry: FrontendCallHistoryEntry
  ): Promise<boolean> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}/history/${no}/${index}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    })
    const result = await response.json()
    return result.success
  }

  /**
   * Delete call history entry
   */
  static async deleteCallHistory(
    listId: string,
    no: string,
    index: number
  ): Promise<boolean> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}/history/${no}/${index}`, {
      method: 'DELETE',
    })
    const result = await response.json()
    return result.success
  }

  /**
   * Update record and add call history
   */
  static async updateRecord(
    listId: string,
    no: string,
    fields?: Partial<FrontendCustomerRecord>,
    newCallHistoryEntries?: FrontendCallHistoryEntry[],
    operatorName?: string
  ): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}/update/${no}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields,
        newCallHistoryEntries,
        operatorName,
      }),
    })
    return response.json()
  }

  /**
   * Import TSV/JSON data
   */
  static async importData(
    listId: string,
    data: FrontendCustomerRecord[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/lists/${listId}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data, mode }),
    })
    return response.json()
  }

  /**
   * Search records by No
   */
  static async searchByNo(no: string): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/search?no=${encodeURIComponent(no)}`)
    return response.json()
  }

  /**
   * Login
   */
  static async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
    return response.json()
  }

  /**
   * Logout (clears the server-side session cookie)
   */
  static async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST' })
  }

  /**
   * Restore the current session from the HttpOnly cookie
   */
  static async getMe(): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/me`)
    return response.json()
  }

  /**
   * List all user accounts (admin only)
   */
  static async listUsers(): Promise<ApiResponse<User[]>> {
    const response = await apiFetch(`${API_BASE}/admin/users`)
    const result = await response.json()
    return { ...result, data: result.users }
  }

  /**
   * Create a user account (admin only)
   */
  static async createUser(
    username: string,
    displayName: string,
    password: string,
    role: string
  ): Promise<ApiResponse<User>> {
    const response = await apiFetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName, password, role }),
    })
    const result = await response.json()
    return { ...result, data: result.user }
  }

  /**
   * Update a user account (admin only)
   */
  static async updateUser(
    id: string,
    updates: { username?: string; displayName?: string; password?: string; role?: string }
  ): Promise<ApiResponse<User>> {
    const response = await apiFetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const result = await response.json()
    return { ...result, data: result.user }
  }

  /**
   * Delete a user account (admin only)
   */
  static async deleteUser(id: string): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' })
    return response.json()
  }

  /**
   * List all available customer lists
   */
  static async listLists(): Promise<ApiResponse<ListDefinition[]>> {
    const response = await apiFetch(`${API_BASE}/lists`)
    const result = await response.json()
    return { ...result, data: result.lists }
  }

  /**
   * Create a new customer list (admin only)
   */
  static async createList(name: string): Promise<ApiResponse<ListDefinition>> {
    const response = await apiFetch(`${API_BASE}/admin/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const result = await response.json()
    return { ...result, data: result.list }
  }

  /**
   * Rename a customer list (admin only)
   */
  static async renameList(id: string, name: string): Promise<ApiResponse<ListDefinition>> {
    const response = await apiFetch(`${API_BASE}/admin/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const result = await response.json()
    return { ...result, data: result.list }
  }

  /**
   * Delete a customer list (admin only). Pass confirm=true after the caller
   * has reviewed the customerCount returned by a prior unconfirmed call.
   */
  static async deleteList(id: string, confirm = false): Promise<ApiResponse & { requiresConfirmation?: boolean; customerCount?: number }> {
    const response = await apiFetch(`${API_BASE}/admin/lists/${id}${confirm ? '?confirm=true' : ''}`, {
      method: 'DELETE',
    })
    return response.json()
  }

  /**
   * Detect duplicate customers across all lists (admin only, read-only)
   */
  static async getDuplicates(): Promise<ApiResponse<any[]>> {
    const response = await apiFetch(`${API_BASE}/admin/duplicates`)
    const result = await response.json()
    return { ...result, data: result.groups }
  }

  /**
   * Merge duplicate customers into one record (admin only)
   */
  static async mergeDuplicates(primaryId: string, duplicateIds: string[]): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/admin/duplicates/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryId, duplicateIds }),
    })
    return response.json()
  }

  /**
   * Send Slack notification
   */
  static async sendSlackNotification(
    record: FrontendCustomerRecord,
    callEntry: FrontendCallHistoryEntry
  ): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/slack/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ record, callEntry }),
    })
    return response.json()
  }

  /**
   * Fetch order-won (受注) visit results shared across all sales reps.
   * Optional filters narrow the search to a No./company name/operator.
   */
  static async getVisitResultFeed(filters?: {
    no?: string
    companyName?: string
    operator?: string
  }): Promise<ApiResponse<VisitResultFeedEntry[]>> {
    const params = new URLSearchParams()
    if (filters?.no) params.set('no', filters.no)
    if (filters?.companyName) params.set('companyName', filters.companyName)
    if (filters?.operator) params.set('operator', filters.operator)
    const qs = params.toString()
    const response = await apiFetch(`${API_BASE}/feed${qs ? `?${qs}` : ''}`)
    return response.json()
  }

  /**
   * Create a Google Calendar event on the shared team calendar
   */
  static async createCalendarEvent(params: {
    title: string
    description?: string
    date: string
    startTime: string
    endTime: string
  }): Promise<ApiResponse & { htmlLink?: string }> {
    const response = await apiFetch(`${API_BASE}/calendar/create-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return response.json()
  }

  /**
   * Search companies via the NTA houjin-bangou API (admin only)
   */
  static async searchCompany(name: string): Promise<ApiResponse<any[]>> {
    const response = await apiFetch(`${API_BASE}/admin/company-lookup?name=${encodeURIComponent(name)}`)
    const result = await response.json()
    return { ...result, data: result.candidates }
  }

  /**
   * Apply a looked-up company's name/address to an existing customer record (admin only)
   */
  static async applyCompanyInfo(
    listId: string,
    no: string,
    fields: { companyName?: string; address?: string; zipCode?: string }
  ): Promise<ApiResponse> {
    const response = await apiFetch(`${API_BASE}/admin/company-lookup/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listId, no, ...fields }),
    })
    return response.json()
  }
}
