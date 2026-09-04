export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, getNextGlobalNos, TABLES } from '@/lib/supabase'
import { toDbFormat, FrontendCustomerRecord } from '@/lib/types'
import { requireAdmin } from '@/lib/auth'

interface ImportRequestBody {
  data: FrontendCustomerRecord[]
  mode?: 'append' | 'replace'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const { listId } = params
    const body: ImportRequestBody = await request.json()

    if (!(await verifyListExists(supabaseAdmin, listId))) {
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

    const mode = body.mode || 'append'

    // If replace mode, delete all existing records for this list only
    if (mode === 'replace') {
      const { error: deleteError } = await supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .delete()
        .eq('list_slug', listId)

      if (deleteError) {
        throw new Error(`既存データの削除エラー: ${deleteError.message}`)
      }
    }

    // No未入力の行には、全リストを通した連番を自動採番する(新規レコード作成と同じ基準)
    const blankNoCount = body.data.filter((record) => !record.no || !String(record.no).trim()).length
    const autoNos = blankNoCount > 0 ? await getNextGlobalNos(supabaseAdmin, blankNoCount) : []
    let autoNoIndex = 0
    const dataWithNos = body.data.map((record) => {
      if (record.no && String(record.no).trim()) return record
      return { ...record, no: autoNos[autoNoIndex++] }
    })

    // Convert to database format and tag with the target list
    const dbRecords = dataWithNos.map((record) => ({ ...toDbFormat(record), list_slug: listId }))

    // Insert or upsert records in batches (Supabase has a limit of ~1000 rows per request)
    const batchSize = 500
    let insertedCount = 0
    let errorCount = 0

    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize)

      try {
        const { data, error } = await supabaseAdmin
          .from(TABLES.CUSTOMERS)
          .upsert(batch, { onConflict: 'list_slug,no' })
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
      message: `インポート完了: ${insertedCount}件挿入, ${errorCount}件エラー` +
        (blankNoCount > 0 ? ` (うちNo未入力${blankNoCount}件は自動採番)` : ''),
      insertedCount,
      errorCount,
      totalRecords: body.data.length,
      autoNumberedCount: blankNoCount,
    })
  } catch (error: any) {
    console.error('Error in importData:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
