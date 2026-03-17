import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

            // データを変換してインポート
            const importData = rows.map((row) => ({
              timestamp: row.タイムスタンプ ? new Date(row.タイムスタンプ).toISOString() : new Date().toISOString(),
              no: row.No,
              list_type: row.リスト,
              company_name: row.企業名,
              phone: row.電話番号,
              address: row.住所,
              operator_name: row.担当者名,
              date: row.架電日,
              start_time: row.開始時刻,
              end_time: row.終了時刻,
              responder: row.対応者,
              gender: row.性別,
              progress: row.進捗,
              note: row.メモ,
              operator: row.担当オペレーター,
            }))

            // Supabaseにインポート
            const { data, error } = await supabase
              .from('架電履歴_全記録')
              .insert(importData)

            if (error) {
              console.error('Supabase insert error:', error)
              return resolve(
                NextResponse.json(
                  { error: `インポート失敗: ${error.message}` },
                  { status: 500 }
                )
              )
            }

            resolve(
              NextResponse.json({
                success: true,
                message: `${importData.length}件のデータをインポートしました`,
                count: importData.length,
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
