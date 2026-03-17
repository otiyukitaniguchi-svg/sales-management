import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const listType = searchParams.get('list_type')
    const no = searchParams.get('no')

    let query = supabase
      .from('架電履歴_全記録')
      .select('*')
      .order('created_at', { ascending: false })

    if (listType) {
      query = query.eq('list_type', listType)
    }

    if (no) {
      query = query.eq('no', no)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: `データ取得失敗: ${error.message}` },
        { status: 500 }
      )
    }

    // CSVに変換
    const csv = convertToCSV(data || [])

    // CSVレスポンスを返す
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="call-history-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: `リクエスト処理失敗: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) {
    return ''
  }

  // ヘッダーを定義（CSVの列順に合わせる）
  const headers = [
    'タイムスタンプ',
    'No',
    'リスト',
    '企業名',
    '電話番号',
    '住所',
    '担当者名',
    '架電日',
    '開始時刻',
    '終了時刻',
    '対応者',
    '性別',
    '進捗',
    'メモ',
    '担当オペレーター',
  ]

  // データ行を作成
  const rows = data.map((row) => [
    row.timestamp || '',
    row.no || '',
    row.list_type || '',
    row.company_name || '',
    row.phone || '',
    row.address || '',
    row.operator_name || '',
    row.date || '',
    row.start_time || '',
    row.end_time || '',
    row.responder || '',
    row.gender || '',
    row.progress || '',
    row.note || '',
    row.operator || '',
  ])

  // CSVを生成
  const csv = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csv
}
