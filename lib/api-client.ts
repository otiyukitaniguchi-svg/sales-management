import { FrontendCustomerRecord, FrontendCallHistoryEntry, ApiResponse } from './types'

const API_BASE = '/api'

export class ApiClient {
  /**
   * Fetch list data
   */
  static async getListData(listId: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/lists/${listId}`)
    return response.json()
  }

  /**
   * Fetch call history for a specific record
   */
  static async getCallHistory(listId: string, no: string): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/lists/${listId}/history/${no}`)
    return response.json()
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
    const response = await fetch(`${API_BASE}/lists/${listId}/update/${no}`, {
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
    const response = await fetch(`${API_BASE}/lists/${listId}/import`, {
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
    const response = await fetch(`${API_BASE}/search?no=${encodeURIComponent(no)}`)
    return response.json()
  }

  /**
   * Login
   */
  static async login(username: string, password: string): Promise<ApiResponse> {
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
   * Send Slack notification
   */
  static async sendSlackNotification(
    record: FrontendCustomerRecord,
    callEntry: FrontendCallHistoryEntry
  ): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/slack/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ record, callEntry }),
    })
    return response.json()
  }
}
