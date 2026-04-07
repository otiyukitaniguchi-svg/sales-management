import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') || 'daily' // daily or monthly

    let query = supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('operator, date, progress')

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data, error } = await query

    if (error) throw error

    // 集計処理
    const stats: Record<string, any> = {}

    data.forEach((row) => {
      const operator = row.operator || '不明'
      let period = row.date || '不明'
      
      if (type === 'monthly' && period !== '不明') {
        // YYYY/MM/DD -> YYYY/MM
        period = period.substring(0, 7)
      }

      const key = `${operator}_${period}`

      if (!stats[key]) {
        stats[key] = {
          operator,
          period,
          total: 0,
          success: 0, // 進捗が「成約」などの成功系
          pending: 0,
          failure: 0,
        }
      }

      stats[key].total += 1
      if (row.progress === '受注' || row.progress === '見込みA' || row.progress === '見込みC' || row.progress === '前回受注' || row.progress === '前回採択') {
        stats[key].success += 1
      } else if (row.progress === '留守' || row.progress === '担当不在' || row.progress === 'いつの日か' || row.progress === '現アナ') {
        stats[key].pending += 1
      } else {
        stats[key].failure += 1
      }
    })

    return NextResponse.json({
      success: true,
      data: Object.values(stats).sort((a, b) => b.period.localeCompare(a.period) || a.operator.localeCompare(b.operator)),
    })
  } catch (error: any) {
    console.error('Error in reports API:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
