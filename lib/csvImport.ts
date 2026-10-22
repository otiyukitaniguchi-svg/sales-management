import { FrontendCustomerRecord } from './types'

type ImportField = Exclude<
  keyof FrontendCustomerRecord,
  'callHistory' | 'callHistoryCount' | 'latestProgress' | 'latestGender'
>

// CSV/TSVの列名 → 顧客レコードの項目。英語名(エクスポート・旧形式)に加え、
// 画面表示名・CSV出力の列名・よくある外部データの列名(日本語)も受け付ける。
// 同じ項目に複数の候補列がある場合は先に書いたものを優先する
// (例: 「住所」と「詳細住所」が両方ある場合は「住所」を使う)
const HEADER_ALIASES: Record<ImportField, string[]> = {
  no: ['no'],
  companyKana: ['companyKana', '企業名フリガナ', '会社名フリガナ', '企業名カナ', '会社名カナ', 'フリガナ'],
  companyName: ['companyName', '企業名', '会社名', '事業所名', '事業者名', '法人名', '商号', '屋号', '顧客名'],
  fixedNo: ['fixedNo', '固定番号', '電話番号', '電話', 'tel', '代表電話', '代表電話番号', '連絡先'],
  otherContact: ['otherContact', 'その他連絡先', '携帯番号', '携帯電話', 'fax'],
  zipCode: ['zipCode', '郵便番号', '〒'],
  addressKana: ['addressKana', '住所フリガナ', '住所カナ'],
  address: ['address', '住所', '所在地', '本社所在地', '詳細住所'],
  repKana: ['repKana', '代表者フリガナ', '代表者カナ'],
  repName: ['repName', '代表者名', '代表者'],
  staffKana: ['staffKana', '担当者フリガナ', '担当者カナ'],
  staffName: ['staffName', '担当者名', '担当者'],
  email: ['email', 'メールアドレス', 'メール', 'e-mail'],
  industry: ['industry', '業種'],
  memo: ['memo', '備考', 'メモ'],
  sales: ['sales', '年間売上', '売上'],
  software: ['software', '既存ソフト', '利用ソフト'],
  decision: ['decision', '決裁者'],
  subsidy: ['subsidy', '過去補助金', '補助金'],
  accountant: ['accountant', '税理士'],
  established: ['established', '設立1年以上', '設立年月'],
  recallDate: ['recallDate', '再コール日', '折返し日'],
  recallTime: ['recallTime', '再コール時間', '折返し時間'],
}

// 大文字小文字・空白・記号(No. など)・BOMの違いを吸収して比較する
function normalizeHeader(header: string): string {
  return header
    .replace(/^﻿/, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s._()（）]/g, '')
}

export interface CsvColumnMapping {
  // 項目 → CSV上の実際の列名
  columns: Partial<Record<ImportField, string>>
  // どの項目にも対応しなかった列名(取り込まれない)
  ignoredHeaders: string[]
}

export function resolveCsvColumns(headers: string[]): CsvColumnMapping {
  const byNormalized = new Map<string, string>()
  for (const h of headers) {
    const key = normalizeHeader(h)
    if (key && !byNormalized.has(key)) byNormalized.set(key, h)
  }

  const columns: Partial<Record<ImportField, string>> = {}
  const used = new Set<string>()
  for (const field of Object.keys(HEADER_ALIASES) as ImportField[]) {
    for (const alias of HEADER_ALIASES[field]) {
      const header = byNormalized.get(normalizeHeader(alias))
      if (header && !used.has(header)) {
        columns[field] = header
        used.add(header)
        break
      }
    }
  }

  const ignoredHeaders = headers.filter((h) => h.trim() && !used.has(h))
  return { columns, ignoredHeaders }
}

export function mapCsvRow(row: Record<string, string>, mapping: CsvColumnMapping): FrontendCustomerRecord {
  const record: Partial<FrontendCustomerRecord> = {}
  for (const [field, header] of Object.entries(mapping.columns) as [ImportField, string][]) {
    const value = (row[header] ?? '').trim()
    if (value) (record as any)[field] = value
  }
  return { no: '', ...record } as FrontendCustomerRecord
}

// No以外に何も値がないレコード(列名が合わずに全項目が空になった行など)か
export function isBlankCustomerRecord(record: Partial<FrontendCustomerRecord>): boolean {
  return (Object.keys(HEADER_ALIASES) as ImportField[])
    .filter((field) => field !== 'no')
    .every((field) => !String(record[field] ?? '').trim())
}

// 列名が合わなかったときに案内するための、受け付ける主な列名
export const ACCEPTED_HEADER_EXAMPLES = '企業名(会社名/事業所名), 電話番号(固定番号/連絡先), 住所, 郵便番号, 業種, 備考 など'
