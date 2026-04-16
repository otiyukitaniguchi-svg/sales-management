export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

// list_type の日本語名変換
const LIST_TYPE_TO_NAME: Record<string, string> = {
  '新規リスト': '新規リスト',
  'ハルエネリスト': 'ハルエネリスト',
  'モバイルリスト': 'モバイルリスト',
  'list1': '新規リスト',
  'list2': 'ハルエネリスト',
  'list3': 'モバイルリスト',
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const yearMonth = searchParams.get('yearMonth') // 例: "2026-03" または null（全期間）

    // 架電履歴を全件取得
    let query = supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('no, list_type, operator, date, start_time, end_time, responder, gender, progress, note')
      .order('date', { ascending: true })

    // 月フィルタ
    if (yearMonth) {
      const [year, month] = yearMonth.split('-')
      const slashPrefix = `${year}/${month.padStart(2, '0')}`
      const hyphenPrefix = `${year}-${month.padStart(2, '0')}`
      query = query.or(`date.like.${slashPrefix}%,date.like.${hyphenPrefix}%`)
    }

    // 全件ページネーション取得
    let from = 0
    const pageSize = 1000
    const allHistory: any[] = []

    while (true) {
      const { data: page, error } = await query.range(from, from + pageSize - 1)
      if (error) {
        console.error('Report fetch error:', error)
        break
      }
      if (!page || page.length === 0) break
      allHistory.push(...page)
      if (page.length < pageSize) break
      from += pageSize
    }

    // 集計処理
    const progressTypes = ['受注', '見込みA', '見込みB', '見込みC', '不在', '再コール', '留守', '拒否', '時期尚早', '']
    const listNames = ['新規リスト', 'ハルエネリスト', 'モバイルリスト']

    // 月一覧を取得
    const monthSet = new Set<string>()
    for (const h of allHistory) {
      if (h.date) {
        const normalized = h.date.replace(/\//g, '-')
        const ym = normalized.substring(0, 7) // "2026-03"
        if (ym.length === 7) monthSet.add(ym)
      }
    }
    const months = Array.from(monthSet).sort()

    // 担当者一覧
    const operatorSet = new Set<string>()
    for (const h of allHistory) {
      if (h.operator) operatorSet.add(h.operator)
    }
    const operators = Array.from(operatorSet).sort()

    // 1. 月別集計
    const monthlyStats: Record<string, {
      total: number
      byProgress: Record<string, number>
      byList: Record<string, number>
    }> = {}

    for (const ym of months) {
      monthlyStats[ym] = { total: 0, byProgress: {}, byList: {} }
    }

    // 2. 担当者別集計
    const operatorStats: Record<string, {
      total: number
      byProgress: Record<string, number>
      byMonth: Record<string, number>
      byList: Record<string, number>
    }> = {}

    for (const op of operators) {
      operatorStats[op] = { total: 0, byProgress: {}, byMonth: {}, byList: {} }
    }

    // 3. 月×担当者クロス集計
    const crossStats: Record<string, Record<string, number>> = {}
    for (const ym of months) {
      crossStats[ym] = {}
      for (const op of operators) {
        crossStats[ym][op] = 0
      }
    }

    // 4. 進捗別集計（全体）
    const progressStats: Record<string, number> = {}

    // 5. リスト別集計
    const listStats: Record<string, { total: number; byProgress: Record<string, number> }> = {}
    for (const ln of listNames) {
      listStats[ln] = { total: 0, byProgress: {} }
    }

    // 集計実行
    for (const h of allHistory) {
      const normalized = h.date ? h.date.replace(/\//g, '-') : ''
      const ym = normalized.substring(0, 7)
      const op = h.operator || '不明'
      const prog = h.progress || ''
      const listName = LIST_TYPE_TO_NAME[h.list_type] || h.list_type || '不明'

      // 月別
      if (monthlyStats[ym]) {
        monthlyStats[ym].total++
        monthlyStats[ym].byProgress[prog] = (monthlyStats[ym].byProgress[prog] || 0) + 1
        monthlyStats[ym].byList[listName] = (monthlyStats[ym].byList[listName] || 0) + 1
      }

      // 担当者別
      if (!operatorStats[op]) {
        operatorStats[op] = { total: 0, byProgress: {}, byMonth: {}, byList: {} }
      }
      operatorStats[op].total++
      operatorStats[op].byProgress[prog] = (operatorStats[op].byProgress[prog] || 0) + 1
      operatorStats[op].byMonth[ym] = (operatorStats[op].byMonth[ym] || 0) + 1
      operatorStats[op].byList[listName] = (operatorStats[op].byList[listName] || 0) + 1

      // クロス集計
      if (crossStats[ym]) {
        crossStats[ym][op] = (crossStats[ym][op] || 0) + 1
      }

      // 進捗別（全体）
      progressStats[prog] = (progressStats[prog] || 0) + 1

      // リスト別
      if (listStats[listName]) {
        listStats[listName].total++
        listStats[listName].byProgress[prog] = (listStats[listName].byProgress[prog] || 0) + 1
      }
    }

    return NextResponse.json({
      success: true,
      totalRecords: allHistory.length,
      months,
      operators,
      monthlyStats,
      operatorStats,
      crossStats,
      progressStats,
      listStats,
    })
  } catch (error: any) {
    console.error('Error in report:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
