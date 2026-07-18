export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, TABLES } from '@/lib/supabase'
import { toFrontendFormat, ListDataResponse, CustomerRecord, CallHistoryRecord } from '@/lib/types'

// 既存3リストは list_type が 'list1' 形式と '新規リスト' 形式で混在しているため、
// 架電件数カウント時は両方を許容する(新規作成されたリストにはこの表記ゆれはない)
const LEGACY_LIST_TYPE_ALIASES: Record<string, string[]> = {
  list1: ['list1', '新規リスト'],
  list2: ['list2', 'ハルエネリスト'],
  list3: ['list3', 'モバイルリスト'],
}

export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  try {
    const listId = params.listId

    if (!(await verifyListExists(supabaseAdmin, listId))) {
      return NextResponse.json(
        { success: false, message: '無効なリストIDです' },
        { status: 400 }
      )
    }

    const pageSize = 1000

    // Fetch all records from the list. Supabase caps a single request at
    // ~1000 rows, so first get the total count, then fire the needed
    // .range() pages in parallel instead of awaiting them one at a time
    // (sequential pagination was the main cause of multi-second list loads).
    const { count: recordCount, error: countError } = await supabaseAdmin
      .from(TABLES.CUSTOMERS)
      .select('*', { count: 'exact', head: true })
      .eq('list_slug', listId)

    if (countError) {
      throw countError
    }

    const recordPageCount = Math.max(1, Math.ceil((recordCount || 0) / pageSize))
    const recordPages = await Promise.all(
      Array.from({ length: recordPageCount }, (_, i) =>
        supabaseAdmin
          .from(TABLES.CUSTOMERS)
          .select('*')
          .eq('list_slug', listId)
          .order('no', { ascending: true })
          .range(i * pageSize, i * pageSize + pageSize - 1)
      )
    )

    let records: CustomerRecord[] = []
    for (const { data, error } of recordPages) {
      if (error) throw error
      if (data) records = records.concat(data)
    }

    // Fetch call history counts for all records (same parallel-pagination
    // pattern; also match legacy list_type aliases so counts aren't
    // silently short for the original 3 lists)
    const historyListTypes = LEGACY_LIST_TYPE_ALIASES[listId] || [listId]
    const { count: historyCount, error: historyCountError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('*', { count: 'exact', head: true })
      .in('list_type', historyListTypes)

    let historyData: { no: string }[] = []
    if (historyCountError) {
      console.error('Call history count error:', historyCountError)
    } else {
      const historyPageCount = Math.max(1, Math.ceil((historyCount || 0) / pageSize))
      const historyPages = await Promise.all(
        Array.from({ length: historyPageCount }, (_, i) =>
          supabaseAdmin
            .from(TABLES.CALL_HISTORY)
            .select('no')
            .in('list_type', historyListTypes)
            // 並列.range()ページが安定して重複/欠落なく分割されるよう明示的な順序を指定する
            .order('id', { ascending: true })
            .range(i * pageSize, i * pageSize + pageSize - 1)
        )
      )
      for (const { data, error } of historyPages) {
        if (error) {
          console.error('Call history fetch error:', error)
          continue
        }
        if (data) historyData = historyData.concat(data)
      }
    }

    // Create a map of no -> call count
    const historyCountMap: Record<string, number> = {}
    if (historyData) {
      historyData.forEach((item) => {
        historyCountMap[item.no] = (historyCountMap[item.no] || 0) + 1
      })
    }

    // Convert to frontend format and add call history count
    const frontendRecords = (records || []).map((record: CustomerRecord) => {
      const frontendRecord = toFrontendFormat(record)
      frontendRecord.callHistoryCount = historyCountMap[record.no] || 0
      return frontendRecord
    })

    const response: ListDataResponse = {
      success: true,
      listId: listId,
      data: frontendRecords,
      count: frontendRecords.length,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in getListData:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
