export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getTableName, TABLES } from '@/lib/supabase'
import { toDbFormat, callHistoryToDbFormat, FrontendCustomerRecord, FrontendCallHistoryEntry } from '@/lib/types'

interface UpdateRequestBody {
  fields?: Partial<FrontendCustomerRecord>
  newCallHistoryEntries?: FrontendCallHistoryEntry[]
  operatorName?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string; no: string } }
) {
  try {
    const { listId, no } = params
    const body: UpdateRequestBody = await request.json()

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

    const tableName = getTableName(listId as 'list1' | 'list2' | 'list3')

    // 1. Update customer record if fields are provided
    if (body.fields && Object.keys(body.fields).length > 0) {
      const dbFields = toDbFormat(body.fields as FrontendCustomerRecord)
      
      // Remove 'no' from update fields to prevent changing the primary identifier
      const { no: _, ...updateFields } = dbFields

      const { error: updateError } = await supabaseAdmin
        .from(tableName)
        .update(updateFields)
        .eq('no', no)

      if (updateError) {
        throw new Error(`レコード更新エラー: ${updateError.message}`)
      }
    }

    // 2. Add new call history entries
    let addedCount = 0
    if (body.newCallHistoryEntries && body.newCallHistoryEntries.length > 0) {
      const historyRecords = body.newCallHistoryEntries.map((entry) => {
        return callHistoryToDbFormat(entry, listId as 'list1' | 'list2' | 'list3', no)
      })

      // Insert all new call history entries
      const { data: insertedHistory, error: historyError } = await supabaseAdmin
        .from(TABLES.CALL_HISTORY)
        .insert(historyRecords)
        .select()

      if (historyError) {
        console.error('Call history insert error:', historyError)
        // Continue even if history insert fails
      } else {
        addedCount = insertedHistory?.length || 0
      }
    }

    // 3. Get updated history count
    const { count: historyCount, error: countError } = await supabaseAdmin
      .from(TABLES.CALL_HISTORY)
      .select('id', { count: 'exact', head: true })
      .eq('list_type', listId)
      .eq('no', no)

    if (countError) {
      console.warn('History count error (non-critical):', countError)
    }

    // キャッシュ制御ヘッダーを追加
    const headers = new Headers()
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    headers.set('Pragma', 'no-cache')
    headers.set('Expires', '0')

    return NextResponse.json({
      success: true,
      no: no,
      historyCount: historyCount || 0,
      addedHistory: addedCount,
      operator: body.operatorName || '',
      message: '更新が完了しました'
    }, { headers })
  } catch (error: any) {
    console.error('Error in updateRecord:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
