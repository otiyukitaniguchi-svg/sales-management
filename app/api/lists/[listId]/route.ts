import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getTableName, TABLES } from '@/lib/supabase'
import { toFrontendFormat, ListDataResponse, CustomerRecord, CallHistoryRecord } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  try {
    const listId = params.listId as 'list1' | 'list2' | 'list3'
    
    if (!['list1', 'list2', 'list3'].includes(listId)) {
      return NextResponse.json(
        { success: false, message: '無効なリストIDです' },
        { status: 400 }
      )
    }

    const tableName = getTableName(listId)

    // Fetch all records from the list
    // Supabase has a default limit of 1000 rows. We need to fetch in batches using .range()
    let allRecords: CustomerRecord[] = []
    let offset = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: records, error: recordsError } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .order('no', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (recordsError) {
        throw recordsError
      }

      if (!records || records.length === 0) {
        hasMore = false
      } else {
        allRecords = allRecords.concat(records)
        if (records.length < pageSize) {
          hasMore = false
        } else {
          offset += pageSize
        }
      }
    }

    const records = allRecords



    // Fetch call history counts for all records
    const { data: historyData, error: historyError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('no, id')
      .eq('list_type', listId)

    if (historyError) {
      console.error('Call history fetch error:', historyError)
      // Continue without history counts
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
