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

    // 顧客(no, list_type)ごとに最新1件を求める
    const latestByCustomer = new Map<string, CallHistoryRow & { normalizedDate: string }>()
    for (const row of allHistory) {
      const key = `${row.no}__${row.list_type}`
      const normalizedDate = normalizeDate(row.date)
      const candidate = { ...row, normalizedDate }
      const current = latestByCustomer.get(key)
      if (
        !current ||
        normalizedDate > current.normalizedDate ||
        (normalizedDate === current.normalizedDate && (row.start_time || '') > (current.start_time || '')) ||
        (normalizedDate === current.normalizedDate &&
          (row.start_time || '') === (current.start_time || '') &&
          (row.created_at || '') > (current.created_at || ''))
      ) {
        latestByCustomer.set(key, candidate)
      }
    }

    // 分母: 担当者×日付/月ごとの架電数(全履歴)
    const dailyCalls = new Map<string, number>()
    const monthlyCalls = new Map<string, number>()
    const operatorAllCalls = new Map<string, number>()
    for (const row of allHistory) {
      const operator = row.operator || '不明'
      operatorAllCalls.set(operator, (operatorAllCalls.get(operator) || 0) + 1)
      const date = normalizeDate(row.date)
      if (!date) continue
      const month = date.substring(0, 7)
      const dailyKey = `${operator}|${date}`
      const monthlyKey = `${operator}|${month}`
      dailyCalls.set(dailyKey, (dailyCalls.get(dailyKey) || 0) + 1)
      monthlyCalls.set(monthlyKey, (monthlyCalls.get(monthlyKey) || 0) + 1)
    }

    // 分子: 担当者×日付/月ごとの進捗内訳(顧客ごとの最新履歴のみ集計、受注数はこの中の「受注」件数)
    const dailyProgress = new Map<string, Record<string, number>>()
    const monthlyProgress = new Map<string, Record<string, number>>()
    const overallProgressCounts: Record<string, number> = {}
    const operatorProgressCounts = new Map<string, Record<string, number>>()

    for (const row of Array.from(latestByCustomer.values())) {
      const operator = row.operator || '不明'
      const label = normalizeProgressLabel(row.progress)
      const date = row.normalizedDate

      overallProgressCounts[label] = (overallProgressCounts[label] || 0) + 1

      if (!operatorProgressCounts.has(operator)) operatorProgressCounts.set(operator, {})
      const opCounts = operatorProgressCounts.get(operator)!
      opCounts[label] = (opCounts[label] || 0) + 1

      if (!date) continue
      const month = date.substring(0, 7)
      const dailyKey = `${operator}|${date}`
      const monthlyKey = `${operator}|${month}`

      if (!dailyProgress.has(dailyKey)) dailyProgress.set(dailyKey, {})
      const d = dailyProgress.get(dailyKey)!
      d[label] = (d[label] || 0) + 1

      if (!monthlyProgress.has(monthlyKey)) monthlyProgress.set(monthlyKey, {})
      const m = monthlyProgress.get(monthlyKey)!
      m[label] = (m[label] || 0) + 1
    }

    const buildRows = (
      callsMap: Map<string, number>,
      progressMap: Map<string, Record<string, number>>
    ): Array<PeriodStat & { period: string }> => {
      const rows: Array<PeriodStat & { period: string }> = []
      for (const [key, calls] of Array.from(callsMap.entries())) {
        const [operator, period] = key.split('|')
        const progressCounts = progressMap.get(key) || {}
        const orders = progressCounts['受注'] || 0
        rows.push({
          period,
          operator,
          calls,
          orders,
          orderRate: calls > 0 ? (orders / calls) * 100 : 0,
          progressCounts,
        })
      }
      rows.sort((a, b) => b.period.localeCompare(a.period) || a.operator.localeCompare(b.operator))
      return rows
    }

    const daily = buildRows(dailyCalls, dailyProgress)
    const monthly = buildRows(monthlyCalls, monthlyProgress)

    // 進捗カテゴリの一覧(グラフ・表の列順を固定するため)
    const knownCategories: string[] = PROGRESS_OPTIONS.filter((o) => o.value !== '').map((o) => o.label)
    const extraCategories = Object.keys(overallProgressCounts).filter(
      (c) => c !== '未設定' && !knownCategories.includes(c)
    )
    const progressCategories = [...knownCategories, ...extraCategories, '未設定']

    const operatorNameSet = new Set<string>()
    for (const k of Array.from(operatorAllCalls.keys())) operatorNameSet.add(k)
    for (const k of Array.from(operatorProgressCounts.keys())) operatorNameSet.add(k)
    const operators = Array.from(operatorNameSet).sort((a, b) => a.localeCompare(b, 'ja'))

    const totalCalls = allHistory.length
    const totalCustomers = latestByCustomer.size
    const totalOrders = overallProgressCounts['受注'] || 0

    const overall = {
      totalCalls,
      totalCustomers,
      orders: totalOrders,
      orderRate: totalCalls > 0 ? (totalOrders / totalCalls) * 100 : 0,
      progressCounts: overallProgressCounts,
    }

    const byOperator: Record<
      string,
      { totalCalls: number; orders: number; orderRate: number; progressCounts: Record<string, number> }
    > = {}
    for (const operator of operators) {
      const opCalls = operatorAllCalls.get(operator) || 0
      const progressCounts = operatorProgressCounts.get(operator) || {}
      const orders = progressCounts['受注'] || 0
      byOperator[operator] = {
        totalCalls: opCalls,
        orders,
        orderRate: opCalls > 0 ? (orders / opCalls) * 100 : 0,
        progressCounts,
      }
    }

    return NextResponse.json({
      success: true,
      progressCategories,
      operators,
      overall,
      byOperator,
      daily,
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
