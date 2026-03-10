import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, LIST_TYPE_MAP, TABLES } from '@/lib/supabase'
import { toFrontendFormat } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const no = searchParams.get('no')

    if (!no) {
      return NextResponse.json(
        { success: false, message: '検索キーワード(No)が指定されていません' },
        { status: 400 }
      )
    }

    const results = []

    // Search across all three lists
    for (const [listId, tableName] of Object.entries(LIST_TYPE_MAP)) {
      const { data: records, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .eq('no', no)

      if (error) {
        console.error(`Search error in ${tableName}:`, error)
        continue
      }

      if (records && records.length > 0) {
        // Get call history count for this record
        const { data: historyData } = await supabaseAdmin
          .from(TABLES.CALL_HISTORY)
          .select('id', { count: 'exact' })
          .eq('list_type', listId)
          .eq('no', no)

        const frontendRecord = toFrontendFormat(records[0])
        frontendRecord.callHistoryCount = historyData?.length || 0

        results.push({
          listId: listId,
          record: frontendRecord,
        })
      }
    }

    return NextResponse.json({
      success: true,
      results: results,
      count: results.length,
    })
  } catch (error: any) {
    console.error('Error in search:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
