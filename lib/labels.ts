/**
 * フィールドラベル定義（日本語表示用）
 */

export const FIELD_LABELS = {
  // 基本情報
  no: 'No',
  companyKana: '企業名フリガナ',
  companyName: '企業名',
  fixedNo: '固定番号',
  otherContact: 'その他連絡先',
  
  // 住所情報
  zipCode: '郵便番号',
  addressKana: '住所フリガナ',
  address: '住所',
  
  // 代表者情報
  repKana: '代表者フリガナ',
  repName: '代表者名',
  
  // 担当者情報
  staffKana: '担当者フリガナ',
  staffName: '担当者名',
  email: 'メールアドレス',
  
  // その他情報
  industry: '業種',
  memo: '備考',
  sales: '年間売上',
  software: '既存ソフト',
  decision: '決裁者',
  subsidy: '過去補助金',
  accountant: '税理士',
  established: '設立1年以上',
  recallDate: '再コール日',
  recallTime: '再コール時間',
  
  // 架電履歴
  operator: '担当者',
  date: '日付',
  startTime: '開始時間',
  endTime: '終了時間',
  responder: '応対者',
  gender: '性別',
  progress: '進捗',
  note: '備考',
} as const

export const LIST_LABELS = {
  list1: '新規リスト',
  list2: 'ハルエネリスト',
  list3: 'モバイルリスト',
} as const

export const PROGRESS_OPTIONS = [
  { value: '', label: '-' },
  { value: '見込みA', label: '見込みA' },
  { value: '見込みB', label: '見込みB' },
  { value: '見込みC', label: '見込みC' },
  { value: '受注', label: '受注' },
  { value: '不在', label: '不在' },
  { value: '再コール', label: '再コール' },
] as const

export const GENDER_OPTIONS = [
  { value: '', label: '-' },
  { value: '男性', label: '男性' },
  { value: '女性', label: '女性' },
] as const

export const DECISION_OPTIONS = [
  { value: '', label: '-' },
  { value: '社長', label: '社長' },
  { value: '役員', label: '役員' },
  { value: '部長', label: '部長' },
  { value: 'その他', label: 'その他' },
] as const

// ヘルパー関数：フィールド名からラベルを取得
export function getLabel(fieldName: keyof typeof FIELD_LABELS): string {
  return FIELD_LABELS[fieldName] || fieldName
}
