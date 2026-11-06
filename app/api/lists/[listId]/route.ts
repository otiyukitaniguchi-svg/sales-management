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

// レコードを全件取得する。Supabaseは1リクエストあたり最大1000行なので、
// 1ページ目はcountを同時取得してその結果で必要なページ数を判断し、
// 残りのページ(あれば)を並列取得する(countだけの往復を減らすため)
async function fetchAllCustomerRecords(listId: string, pageSize: number): Promise<CustomerRecord[]> {
  const { data: firstPage, count, error } = await supabaseAdmin
    .from(TABLES.CUSTOMERS)
    .select('*', { count: 'exact' })
    .eq('list_slug', listId)
    .order('no', { ascending: true })
    .range(0, pageSize - 1)

  if (error) throw error

  let records: CustomerRecord[] = firstPage || []
  const pageCount = Math.max(1, Math.ceil((count || 0) / pageSize))
  if (pageCount > 1) {
    const remainingPages = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, i) => {
        const page = i + 1
        return supabaseAdmin
          .from(TABLES.CUSTOMERS)
          .select('*')
          .eq('list_slug', listId)
          .order('no', { ascending: true })
          .range(page * pageSize, page * pageSize + pageSize - 1)
      })
    )
    for (const { data, error: pageError } of remainingPages) {
      if (pageError) throw pageError
      if (data) records = records.concat(data)
    }
  }
  return records
}

// 架電件数をPostgres側でGROUP BY集計して取得する(get_call_counts RPC、
// see supabase-migrate-call-count-rpc.sql)。個々の履歴行を全件取得して
// Node側で数えるより転送量が圧倒的に少なく、リスト読み込みが速くなる
async function fetchCallCountMap(listTypes: string[]): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin.rpc('get_call_counts', { p_list_types: listTypes })
  if (error) {
    console.error('Call history count error:', error)
    return {}
  }
  const map: Record<string, number> = {}
  ;(data as { no: string; cnt: number }[] | null)?.forEach((row) => {
    map[row.no] = Number(row.cnt)
  })
  return map
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

    // Fetch all records from the list, and the per-record call counts for
    // it, concurrently — these two queries don't depend on each other, so
    // awaiting them one after another was pure wasted latency.
    const historyListTypes = LEGACY_LIST_TYPE_ALIASES[listId] || [listId]
    const [records, historyCountMap] = await Promise.all([
      fetchAllCustomerRecords(listId, pageSize),
      fetchCallCountMap(historyListTypes),
    ])

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
