export const dynamic = "force-dynamic"
// 大きなCSVでも途中でタイムアウトして一部(例: 1000件)しか入らない事態を防ぐ
export const maxDuration = 60
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyListExists, getNextGlobalNos, TABLES } from '@/lib/supabase'
import { toDbFormat, FrontendCustomerRecord } from '@/lib/types'
import { requireAdmin } from '@/lib/auth'
import { isBlankCustomerRecord, fitToColumnLimits } from '@/lib/csvImport'

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

    // No以外が空のレコードは登録しない(列名が合わないCSVを取り込むと、
    // 件数分の空レコードだけが作られて画面が真っ白になっていた)
    const nonBlankData = body.data.filter((record) => !isBlankCustomerRecord(record))
    const skippedBlankCount = body.data.length - nonBlankData.length

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
    const blankNoCount = nonBlankData.filter((record) => !record.no || !String(record.no).trim()).length
    const autoNos = blankNoCount > 0 ? await getNextGlobalNos(supabaseAdmin, blankNoCount) : []
    let autoNoIndex = 0
    const dataWithNos = nonBlankData.map((record) => {
      if (record.no && String(record.no).trim()) return record
      return { ...record, no: autoNos[autoNoIndex++] }
    })

    // Convert to database format and tag with the target list
    const dbRecords = dataWithNos.map((record) => ({ ...toDbFormat(fitToColumnLimits(record)), list_slug: listId }))

    // Insert or upsert records in batches (Supabase has a limit of ~1000 rows per request)
    const batchSize = 500
    let insertedCount = 0
    let errorCount = 0

    // 1行でも制約違反があるとバッチ全体が拒否されるため、失敗したバッチは
    // 1行ずつ登録し直して、問題のある行だけを失敗として理由付きで返す
    // (No.はこのリクエスト内で確定済みなので、再登録しても重複しない)
    const failedRows: { no: string; companyName: string; message: string }[] = []

    const upsertRows = async (rows: typeof dbRecords) => {
      const { data, error } = await supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .upsert(rows, { onConflict: 'list_slug,no' })
        .select('no')
      if (error) throw error
      return data?.length || 0
    }

    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize)

      try {
        insertedCount += await upsertRows(batch)
      } catch (batchError: any) {
        console.error(`Batch ${i / batchSize + 1} error, retrying row by row:`, batchError)
        const concurrency = 10
        for (let j = 0; j < batch.length; j += concurrency) {
          const results = await Promise.allSettled(batch.slice(j, j + concurrency).map((row) => upsertRows([row])))
          results.forEach((result, k) => {
            const row = batch[j + k]
            if (result.status === 'fulfilled') {
              insertedCount += result.value
            } else {
              errorCount += 1
              failedRows.push({
                no: row.no,
                companyName: row.company_name || '',
                message: (result.reason as any)?.message || String(result.reason),
              })
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `インポート完了: ${insertedCount}件挿入, ${errorCount}件エラー` +
        (blankNoCount > 0 ? ` (うちNo未入力${blankNoCount}件は自動採番)` : '') +
        (skippedBlankCount > 0 ? ` (空行${skippedBlankCount}件はスキップ)` : ''),
      insertedCount,
      errorCount,
      totalRecords: body.data.length,
      autoNumberedCount: blankNoCount,
      skippedBlankCount,
      failedRows,
    })
  } catch (error: any) {
    console.error('Error in importData:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
