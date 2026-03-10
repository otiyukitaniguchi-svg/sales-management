// Database record types
export interface CustomerRecord {
  id?: string
  no: string
  company_kana?: string
  company_name?: string
  fixed_no?: string
  other_contact?: string
  zip_code?: string
  address_kana?: string
  address?: string
  rep_kana?: string
  rep_name?: string
  staff_kana?: string
  staff_name?: string
  email?: string
  industry?: string
  memo?: string
  sales?: string
  software?: string
  decision?: string
  subsidy?: string
  accountant?: string
  established?: string
  recall_date?: string
  recall_time?: string
  created_at?: string
  updated_at?: string
}

// Call history record
export interface CallHistoryRecord {
  id?: string
  list_type: 'list1' | 'list2' | 'list3'
  no: string
  operator?: string
  date?: string
  start_time?: string
  end_time?: string
  responder?: string
  gender?: string
  progress?: string
  note?: string
  created_at?: string
  updated_at?: string
}

// User record
export interface User {
  id?: string
  username: string
  display_name: string
  password_hash?: string
  role?: string
  created_at?: string
  updated_at?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface ListDataResponse {
  success: boolean
  listId: string
  data: CustomerRecord[]
  count: number
  timestamp?: string
}

export interface CallHistoryResponse {
  success: boolean
  data: FrontendCallHistoryEntry[]
  count: number
}

// Frontend types (matching original GAS system)
export interface FrontendCustomerRecord {
  no: string
  companyKana?: string
  companyName?: string
  fixedNo?: string
  otherContact?: string
  zipCode?: string
  addressKana?: string
  address?: string
  repKana?: string
  repName?: string
  staffKana?: string
  staffName?: string
  email?: string
  industry?: string
  memo?: string
  sales?: string
  software?: string
  decision?: string
  subsidy?: string
  accountant?: string
  established?: string
  recallDate?: string
  recallTime?: string
  callHistory?: FrontendCallHistoryEntry[]
  callHistoryCount?: number
}

export interface FrontendCallHistoryEntry {
  no?: string
  operator?: string
  date?: string
  startTime?: string
  endTime?: string
  responder?: string
  gender?: string
  progress?: string
  note?: string
}

// Convert between frontend and database formats
export function toDbFormat(record: FrontendCustomerRecord): CustomerRecord {
  return {
    no: record.no,
    company_kana: record.companyKana,
    company_name: record.companyName,
    fixed_no: record.fixedNo,
    other_contact: record.otherContact,
    zip_code: record.zipCode,
    address_kana: record.addressKana,
    address: record.address,
    rep_kana: record.repKana,
    rep_name: record.repName,
    staff_kana: record.staffKana,
    staff_name: record.staffName,
    email: record.email,
    industry: record.industry,
    memo: record.memo,
    sales: record.sales,
    software: record.software,
    decision: record.decision,
    subsidy: record.subsidy,
    accountant: record.accountant,
    established: record.established,
    recall_date: record.recallDate,
    recall_time: record.recallTime,
  }
}

export function toFrontendFormat(record: CustomerRecord): FrontendCustomerRecord {
  return {
    no: record.no,
    companyKana: record.company_kana,
    companyName: record.company_name,
    fixedNo: record.fixed_no,
    otherContact: record.other_contact,
    zipCode: record.zip_code,
    addressKana: record.address_kana,
    address: record.address,
    repKana: record.rep_kana,
    repName: record.rep_name,
    staffKana: record.staff_kana,
    staffName: record.staff_name,
    email: record.email,
    industry: record.industry,
    memo: record.memo,
    sales: record.sales,
    software: record.software,
    decision: record.decision,
    subsidy: record.subsidy,
    accountant: record.accountant,
    established: record.established,
    recallDate: record.recall_date,
    recallTime: record.recall_time,
    callHistory: [],
    callHistoryCount: 0,
  }
}

export function callHistoryToDbFormat(
  entry: FrontendCallHistoryEntry,
  listType: 'list1' | 'list2' | 'list3',
  no: string
): CallHistoryRecord {
  return {
    list_type: listType,
    no: no,
    operator: entry.operator,
    date: entry.date,
    start_time: entry.startTime,
    end_time: entry.endTime,
    responder: entry.responder,
    gender: entry.gender,
    progress: entry.progress,
    note: entry.note,
  }
}

export function callHistoryToFrontendFormat(record: CallHistoryRecord): FrontendCallHistoryEntry {
  return {
    no: record.no,
    operator: record.operator,
    date: record.date,
    startTime: record.start_time,
    endTime: record.end_time,
    responder: record.responder,
    gender: record.gender,
    progress: record.progress,
    note: record.note,
  }
}
