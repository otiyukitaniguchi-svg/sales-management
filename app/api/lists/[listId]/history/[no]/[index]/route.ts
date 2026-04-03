import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { callHistoryToDbFormat } from '@/lib/types'

// キャッシュ制御ヘッダー
const cacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { listId: string; no: string; index: string } }
) {
  try {
    const { listId, no, index } = params
    const idx = parseInt(index)
    const body = await request.json()

    // 1. 現在の履歴を取得（表示順と同じdate DESC, start_time DESC）
    const { data: history, error: fetchError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*')
      .eq('no', no)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (fetchError) throw fetchError

    if (!history || history.length <= idx) {
      return NextResponse.json({ success: false, message: '指定された履歴が見つかりません' }, { status: 404 })
    }

    // 2. 対象の履歴を更新
    const targetId = history[idx].id
    const dbEntry = callHistoryToDbFormat(body, listId as any, no)
    
    // 更新不可フィールドを除外
    const { id, created_at, updated_at, ...updateData } = dbEntry as any

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .update(updateData)
      .eq('id', targetId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true }, { headers: cacheHeaders })
  } catch (error: any) {
    console.error('Error in updateCallHistoryByIndex:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string; no: string; index: string } }
) {
  try {
    const { no, index } = params
    const idx = parseInt(index)

    // 1. 現在の履歴を取得（表示順と同じdate DESC, start_time DESC）
    const { data: history, error: fetchError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*')
      .eq('no', no)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    if (fetchError) throw fetchError

    if (!history || history.length <= idx) {
      return NextResponse.json({ success: false, message: '指定された履歴が見つかりません' }, { status: 404 })
    }

    // 2. 対象の履歴を削除
    const targetId = history[idx].id
    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .delete()
      .eq('id', targetId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true }, { headers: cacheHeaders })
  } catch (error: any) {
    console.error('Error in deleteCallHistoryByIndex:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
