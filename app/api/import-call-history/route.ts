export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import Papa from 'papaparse'

// スプレッドシートのリスト名 → DBのlist_type変換
const LIST_NAME_TO_TYPE: Record<string, string> = {
  '新規リスト': 'list1',
  'ハルエネリスト': 'list2',
  'モバイルリスト': 'list3',
  'list1': 'list1',
  'list2': 'list2',
  'list3': 'list3',
}

interface CallHistoryRow {
  タイムスタンプ: string
  No: string
  リスト: string
  企業名: string
  電話番号: string
  住所: string
  担当者名: string
  架電日: string
  開始時刻: string
  終了時刻: string
  対応者: string
  性別: string
  進捗: string
  メモ: string
  担当オペレーター: string
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      )
    }

    // CSVファイルを読み込む
    const text = await file.text()

    // CSVをパース
    return new Promise<Response>((resolve) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data as CallHistoryRow[]

            if (rows.length === 0) {
              return resolve(
                NextResponse.json(
                  { error: 'CSVにデータがありません' },
                  { status: 400 }
                )
              )
            }

            // 架電履歴_全記録テーブルのカラムにマッピング
            // list_typeはスプレッドシートの日本語名をDBのlist1/list2/list3に変換
            const importData = rows.map((row) => {
              const listType = LIST_NAME_TO_TYPE[row.リスト?.trim()] || 'list1'
              return {
                list_type: listType,
                no: row.No?.trim() || '',
                operator: row.担当オペレーター?.trim() || '',
                date: row.架電日?.trim() || '',
                start_time: row.開始時刻?.trim() || '',
                end_time: row.終了時刻?.trim() || '',
                responder: row.対応者?.trim() || '',
                gender: row.性別?.trim() || '',
                progress: row.進捗?.trim() || '',
                note: row.メモ?.trim() || '',
              }
            }).filter(row => row.no) // Noが空の行はスキップ

            if (importData.length === 0) {
              return resolve(
                NextResponse.json(
                  { error: '有効なデータがありません（No列が空）' },
                  { status: 400 }
                )
              )
            }

            // バッチ処理（500件ずつ）
            const batchSize = 500
            let insertedCount = 0
            let errorCount = 0

            for (let i = 0; i < importData.length; i += batchSize) {
              const batch = importData.slice(i, i + batchSize)
              const { data, error } = await supabaseAdmin
                .from(TABLES.CALL_HISTORY)
                .insert(batch)
                .select()

              if (error) {
                console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error)
                errorCount += batch.length
              } else {
                insertedCount += data?.length || 0
              }
            }

            resolve(
              NextResponse.json({
                success: true,
                message: `インポート完了: ${insertedCount}件挿入, ${errorCount}件エラー`,
                count: insertedCount,
                errorCount,
                totalRows: rows.length,
              })
            )
          } catch (error) {
            console.error('Parse error:', error)
            resolve(
              NextResponse.json(
                { error: `パース失敗: ${error instanceof Error ? error.message : '不明なエラー'}` },
                { status: 500 }
              )
            )
          }
        },
        error: (error: any) => {
          console.error('Papa parse error:', error)
          resolve(
            NextResponse.json(
              { error: `CSV解析失敗: ${error.message}` },
              { status: 400 }
            )
          )
        },
      })
    })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: `リクエスト処理失敗: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500 }
    )
  }
}
