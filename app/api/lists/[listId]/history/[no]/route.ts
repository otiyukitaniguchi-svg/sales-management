export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { callHistoryToFrontendFormat, callHistoryToDbFormat, CallHistoryResponse } from '@/lib/types'
import { FrontendCallHistoryEntry } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string; no: string } }
) {
  try {
    const { listId, no } = params

    if (!['list1', 'list2', 'list3'].includes(listId)) {
      return NextResponse.json(
        { success: false, message: '無効なリストIDです' },
        { status: 400 }
      )
    }

    if (!no) {
      return NextResponse.json(
        { success: false, message: 'Noが指定されていません' },
        { status: 400 }
      )
    }

    // Fetch call history for this record (list_type と no をキーに取得)
    // 架電日・開始時刻・作成日時の降順（最新が一番上）でソート
    const { data: history, error } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*')
      .eq('list_type', listId)
      .eq('no', no)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const frontendHistory = (history || []).map(callHistoryToFrontendFormat)

    const response: CallHistoryResponse = {
      success: true,
      data: frontendHistory,
      count: frontendHistory.length,
    }

    // キャッシュ制御ヘッダーを追加
    const headers = new Headers()
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    headers.set('Pragma', 'no-cache')
    headers.set('Expires', '0')

    return NextResponse.json(response, { headers })
  } catch (error: any) {
    console.error('Error in getCallHistory:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string; no: string } }
) {
  try {
    const { listId, no } = params

    if (!['list1', 'list2', 'list3'].includes(listId)) {
      return NextResponse.json(
        { success: false, message: '無効なリストIDです' },
        { status: 400 }
      )
    }

    if (!no) {
      return NextResponse.json(
        { success: false, message: 'Noが指定されていません' },
        { status: 400 }
      )
    }

    const entry: FrontendCallHistoryEntry = await request.json()
    const dbEntry = callHistoryToDbFormat(entry, listId as 'list1' | 'list2' | 'list3', no)

    const { data, error } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .insert([dbEntry])
      .select()

    if (error) {
      throw error
    }

    const response = {
      success: true,
      data: data ? data.map(callHistoryToFrontendFormat) : [],
    }

    const headers = new Headers()
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    headers.set('Pragma', 'no-cache')
    headers.set('Expires', '0')

    return NextResponse.json(response, { headers })
  } catch (error: any) {
    console.error('Error in createCallHistory:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
