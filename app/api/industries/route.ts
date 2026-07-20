export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

// 全レコードの《業種》の値を集計し、件数付きの一覧として返す(業種ピッカー・管理画面で共用)
export async function GET() {
  try {
    let from = 0
    const pageSize = 1000
    const counts: Record<string, number> = {}

    while (true) {
      const { data, error } = await supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .select('industry')
        .range(from, from + pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        const name = (row.industry || '').trim()
        if (!name) continue
        counts[name] = (counts[name] || 0) + 1
      }

      if (data.length < pageSize) break
      from += pageSize
    }

    const industries = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'))

    return NextResponse.json({ success: true, industries })
  } catch (error: any) {
    console.error('Error in industries API:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
