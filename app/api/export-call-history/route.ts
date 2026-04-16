export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

// DBのlist_type → 日本語名変換
const LIST_TYPE_TO_NAME: Record<string, string> = {
  'list1': '新規リスト',
  'list2': 'ハルエネリスト',
  'list3': 'モバイルリスト',
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const listType = searchParams.get('list_type')
    const no = searchParams.get('no')

    let query = supabaseAdmin
      .from(TABLES.CALL_HISTORY)
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

  // DBのlist_typeを日本語名に変換してデータ行を作成
  const rows = data.map((row) => [
    row.created_at ? new Date(row.created_at).toLocaleString('ja-JP') : '',
    row.no || '',
    LIST_TYPE_TO_NAME[row.list_type] || row.list_type || '',
    '',  // 企業名（架電履歴テーブルにはないため空白）
    '',  // 電話番号（架電履歴テーブルにはないため空白）
    '',  // 住所（架電履歴テーブルにはないため空白）
    '',  // 担当者名（架電履歴テーブルにはないため空白）
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
