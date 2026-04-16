export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getTableName } from '@/lib/supabase'
import { toDbFormat, FrontendCustomerRecord } from '@/lib/types'

interface ImportRequestBody {
  data: FrontendCustomerRecord[]
  mode?: 'append' | 'replace'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  try {
    const { listId } = params
    const body: ImportRequestBody = await request.json()

    if (!['list1', 'list2', 'list3'].includes(listId)) {
      return NextResponse.json(
        { success: false, message: '無効なリストIDです' },
        { status: 400 }
      )
    }

    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { success: false, message: 'データが不正です' },
        { status: 400 }
      )
    }

    const tableName = getTableName(listId as 'list1' | 'list2' | 'list3')
    const mode = body.mode || 'append'

    // If replace mode, delete all existing records first
    if (mode === 'replace') {
      const { error: deleteError } = await supabaseAdmin
        .from(tableName)
        .delete()
        .neq('no', '') // Delete all records

      if (deleteError) {
        throw new Error(`既存データの削除エラー: ${deleteError.message}`)
      }
    }

    // Convert to database format
    const dbRecords = body.data.map(toDbFormat)

    // Insert or upsert records in batches (Supabase has a limit of ~1000 rows per request)
    const batchSize = 500
    let insertedCount = 0
    let errorCount = 0

    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize)

      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .upsert(batch, { onConflict: 'no' })
          .select()

        if (error) {
          console.error(`Batch ${i / batchSize + 1} error:`, error)
          errorCount += batch.length
        } else {
          insertedCount += data?.length || 0
        }
      } catch (batchError) {
        console.error(`Batch ${i / batchSize + 1} exception:`, batchError)
        errorCount += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `インポート完了: ${insertedCount}件挿入, ${errorCount}件エラー`,
      insertedCount,
      errorCount,
      totalRecords: body.data.length,
    })
  } catch (error: any) {
    console.error('Error in importData:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
