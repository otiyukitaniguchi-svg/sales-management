export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { PROGRESS_OPTIONS } from '@/lib/labels'

interface CallHistoryRow {
  no: string
  list_type: string
  operator: string | null
  date: string | null
  start_time: string | null
  progress: string | null
  created_at: string | null
}

interface PeriodStat {
  operator: string
  calls: number
  orders: number
  orderRate: number
  progressCounts: Record<string, number>
}

const normalizeProgressLabel = (progress: string | null | undefined): string => {
  const v = (progress || '').trim()
  return v === '' ? '未設定' : v
}

// 総架電数に含める進捗ステータス。前回受注/前回NG/前回採択/未設定は
// 「前回までに決着済み」のため対象月の総架電数には含めない。
const ACTIVE_PROGRESS_SET = new Set([
  '受注', '見込みA', '見込みC', 'いつの日か', '留守', '担当不在', '現アナ', '閉業',
])

// 架電履歴の operator は自由入力/表示名変更などにより表記ゆれが起きるため、
// 実在するスタッフ名に正規化する(前後の空白・敬称・スペース付与などを許容し部分一致)
const CANONICAL_OPERATORS = ['安里', '平安名', '浦底', '谷口', '宮﨑', '平良', '糸数', '大城']

const normalizeOperator = (raw: string | null | undefined): string => {
  const v = (raw || '').trim()
  if (!v) return 'その他'
  if (CANONICAL_OPERATORS.includes(v)) return v
  const matched = CANONICAL_OPERATORS.find((name) => v.includes(name))
  return matched || 'その他'
}

export async function GET(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    // 全件をページネーションで取得(Supabaseの1000件上限対策)
    let from = 0
    const pageSize = 1000
    const allHistory: CallHistoryRow[] = []

    while (true) {
      const { data: page, error } = await supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .select('no, list_type, operator, date, start_time, progress, created_at')
        .range(from, from + pageSize - 1)

      if (error) throw error
      if (!page || page.length === 0) break
      allHistory.push(...(page as CallHistoryRow[]))
      if (page.length < pageSize) break
      from += pageSize
    }

    const normalizeDate = (date: string | null) => (date ? date.replace(/\//g, '-') : '')

    // 顧客(no, list_type)×対象月ごとに、その月内での最新1件を求める。
    // 月をまたいだ古い履歴は対象月の集計に含めない(対象月内の最新行のみを数える)。
    type Candidate = CallHistoryRow & { normalizedDate: string; month: string }
    const latestByCustomerMonth = new Map<string, Candidate>()

    for (const row of allHistory) {
      const normalizedDate = normalizeDate(row.date)
      if (!normalizedDate) continue
      const month = normalizedDate.substring(0, 7)
      const key = `${row.no}__${row.list_type}__${month}`
      const candidate: Candidate = { ...row, normalizedDate, month }
      const current = latestByCustomerMonth.get(key)
      if (
        !current ||
        normalizedDate > current.normalizedDate ||
        (normalizedDate === current.normalizedDate && (row.start_time || '') > (current.start_time || '')) ||
        (normalizedDate === current.normalizedDate &&
          (row.start_time || '') === (current.start_time || '') &&
          (row.created_at || '') > (current.created_at || ''))
      ) {
        latestByCustomerMonth.set(key, candidate)
      }
    }

    // 担当者×月ごとに集計する
    // calls(総架電数) = ACTIVE_PROGRESS_SETに該当する対象月最新行の件数
    // progressCounts = 表示用に全カテゴリを保持(受注数はこの中の「受注」件数)
    const callsMap = new Map<string, number>()
    const progressMap = new Map<string, Record<string, number>>()

    for (const row of Array.from(latestByCustomerMonth.values())) {
      const operator = normalizeOperator(row.operator)
      const label = normalizeProgressLabel(row.progress)
      const key = `${operator}|${row.month}`

      if (!progressMap.has(key)) progressMap.set(key, {})
      const counts = progressMap.get(key)!
      counts[label] = (counts[label] || 0) + 1

      if (ACTIVE_PROGRESS_SET.has(label)) {
        callsMap.set(key, (callsMap.get(key) || 0) + 1)
      }
    }

    const allKeys = new Set<string>()
    for (const k of Array.from(callsMap.keys())) allKeys.add(k)
    for (const k of Array.from(progressMap.keys())) allKeys.add(k)

    const monthly: Array<PeriodStat & { period: string }> = []
    for (const key of Array.from(allKeys)) {
      const [operator, period] = key.split('|')
      const progressCounts = progressMap.get(key) || {}
      const calls = callsMap.get(key) || 0
      const orders = progressCounts['受注'] || 0
      monthly.push({
        period,
        operator,
        calls,
        orders,
        orderRate: calls > 0 ? (orders / calls) * 100 : 0,
        progressCounts,
      })
    }
    monthly.sort((a, b) => b.period.localeCompare(a.period) || a.operator.localeCompare(b.operator, 'ja'))

    // 進捗カテゴリの一覧(グラフ・表の列順を固定するため)
    const overallProgressCounts: Record<string, number> = {}
    for (const counts of Array.from(progressMap.values())) {
      for (const [label, cnt] of Object.entries(counts)) {
        overallProgressCounts[label] = (overallProgressCounts[label] || 0) + cnt
      }
    }
    const knownCategories: string[] = PROGRESS_OPTIONS.filter((o) => o.value !== '').map((o) => o.label)
    const extraCategories = Object.keys(overallProgressCounts).filter(
      (c) => c !== '未設定' && !knownCategories.includes(c)
    )
    const progressCategories = [...knownCategories, ...extraCategories, '未設定']

    // 実在スタッフを固定の並び順で必ず表示し(データが0件でも選択できるように)、
    // 正規化しきれなかった分だけ「その他」として末尾に追加する
    const hasOtherData = monthly.some((r) => r.operator === 'その他')
    const operators = [...CANONICAL_OPERATORS, ...(hasOtherData ? ['その他'] : [])]

    // 選択可能な対象月一覧(新しい月順)
    const months = Array.from(new Set(monthly.map((r) => r.period))).sort((a, b) => b.localeCompare(a))

    return NextResponse.json({
      success: true,
      progressCategories,
      operators,
      months,
      monthly,
    })
  } catch (error: any) {
    console.error('Error in reports API:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
