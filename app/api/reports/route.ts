export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

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
    for (const row of allHistory) {
      const operator = row.operator || '不明'
      const date = normalizeDate(row.date)
      if (!date) continue
      const month = date.substring(0, 7)
      const dailyKey = `${operator}|${date}`
      const monthlyKey = `${operator}|${month}`
      dailyCalls.set(dailyKey, (dailyCalls.get(dailyKey) || 0) + 1)
      monthlyCalls.set(monthlyKey, (monthlyCalls.get(monthlyKey) || 0) + 1)
    }

    // 分子: 担当者×日付/月ごとの受注数(顧客ごとの最新履歴が「受注」のものだけ)
    const dailyOrders = new Map<string, number>()
    const monthlyOrders = new Map<string, number>()
    for (const row of Array.from(latestByCustomer.values())) {
      if (row.progress !== '受注') continue
      const operator = row.operator || '不明'
      const date = row.normalizedDate
      if (!date) continue
      const month = date.substring(0, 7)
      const dailyKey = `${operator}|${date}`
      const monthlyKey = `${operator}|${month}`
      dailyOrders.set(dailyKey, (dailyOrders.get(dailyKey) || 0) + 1)
      monthlyOrders.set(monthlyKey, (monthlyOrders.get(monthlyKey) || 0) + 1)
    }

    const buildRows = (
      callsMap: Map<string, number>,
      ordersMap: Map<string, number>
    ): Array<PeriodStat & { period: string }> => {
      const rows: Array<PeriodStat & { period: string }> = []
      for (const [key, calls] of Array.from(callsMap.entries())) {
        const [operator, period] = key.split('|')
        const orders = ordersMap.get(key) || 0
        rows.push({
          period,
          operator,
          calls,
          orders,
          orderRate: calls > 0 ? (orders / calls) * 100 : 0,
        })
      }
      rows.sort((a, b) => b.period.localeCompare(a.period) || a.operator.localeCompare(b.operator))
      return rows
    }

    const daily = buildRows(dailyCalls, dailyOrders)
    const monthly = buildRows(monthlyCalls, monthlyOrders)

    return NextResponse.json({
      success: true,
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
