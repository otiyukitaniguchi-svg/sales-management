import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { callHistoryToFrontendFormat, CallHistoryResponse } from '@/lib/types'

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

    // Fetch call history for this record
    const { data: history, error } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*')
      .eq('list_type', listId)
      .eq('no', no)
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

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in getCallHistory:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
