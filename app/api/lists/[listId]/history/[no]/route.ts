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

    // 修正: list_type の絞り込みを緩和、またはマッピングを考慮する
    // 以前のデータが 'list1' 形式と '新規リスト' 形式で混在している可能性があるため
    const listTypeNames = {
      'list1': ['list1', '新規リスト'],
      'list2': ['list2', 'ハルエネリスト'],
      'list3': ['list3', 'モバイルリスト']
    }
    const allowedTypes = listTypeNames[listId as keyof typeof listTypeNames] || [listId]

    const { data: history, error } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*')
      .eq('no', no)
      .in('list_type', allowedTypes)
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

    const entry: FrontendCallHistoryEntry = await request.json()
    
    // 保存時は一貫性のために日本語名を使用する（既存のDB設計に合わせる）
    const listIdToName = {
      'list1': '新規リスト',
      'list2': 'ハルエネリスト',
      'list3': 'モバイルリスト'
    }
    const dbListType = listIdToName[listId as keyof typeof listIdToName] || listId

    const dbEntry = callHistoryToDbFormat(entry, dbListType as any, no)

    const { data, error } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .insert([dbEntry])
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: data ? data.map(callHistoryToFrontendFormat) : [],
    })
  } catch (error: any) {
    console.error('Error in createCallHistory:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
