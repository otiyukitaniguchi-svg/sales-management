export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // 1. 全ての架電履歴を取得
    const { data: allHistory, error: fetchError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*')

    if (fetchError) throw fetchError
    if (!allHistory || allHistory.length === 0) {
      return NextResponse.json({ success: true, message: '再配置する履歴がありません' })
    }

    // 2. 日付(降順) -> 開始時間(降順) でソート
    // 日付は YYYY/MM/DD 形式、時間は HH:mm 形式を想定
    const sortedHistory = [...allHistory].sort((a, b) => {
      // 日付の比較
      const dateA = a.date || ''
      const dateB = b.date || ''
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA)
      }
      // 時間の比較
      const timeA = a.start_time || ''
      const timeB = b.start_time || ''
      return timeB.localeCompare(timeA)
    })

    // 3. created_at を更新して物理的な順序（デフォルトの取得順）を整える
    // 降順（新しい順）に並べたものに対して、古いものから順に created_at を設定していくことで、
    // 物理的な保存順序も最新が最後（created_atが最大）になるように調整します。
    
    const now = new Date()
    const updates = sortedHistory.reverse().map((item, index) => {
      // 1秒ずつずらして created_at を設定（確実に順序を固定するため）
      const createdAt = new Date(now.getTime() - (sortedHistory.length - index) * 1000)
      return {
        ...item,
        created_at: createdAt.toISOString()
      }
    })

    // 4. 一括更新（Supabaseの制限により小分けにして実行）
    const batchSize = 100
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      const { error: updateError } = await supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .upsert(batch)
      
      if (updateError) throw updateError
    }

    return NextResponse.json({
      success: true,
      message: `${sortedHistory.length}件の履歴を日付・時間順に物理再配置しました。`,
    })
  } catch (error: any) {
    console.error('Error in reorder-history API:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
