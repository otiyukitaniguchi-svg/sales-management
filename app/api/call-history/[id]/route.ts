import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// キャッシュ制御ヘッダー
const cacheHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

// フロントエンド形式からDB形式への変換関数
function callHistoryToDbFormat(entry: any) {
  const dbEntry: any = {}
  if (entry.operator !== undefined) dbEntry.operator = entry.operator
  if (entry.date !== undefined) dbEntry.date = entry.date
  if (entry.startTime !== undefined) dbEntry.start_time = entry.startTime
  if (entry.endTime !== undefined) dbEntry.end_time = entry.endTime
  if (entry.responder !== undefined) dbEntry.responder = entry.responder
  if (entry.gender !== undefined) dbEntry.gender = entry.gender
  if (entry.progress !== undefined) dbEntry.progress = entry.progress
  if (entry.note !== undefined) dbEntry.note = entry.note
  return dbEntry
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('架電履歴_全記録')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: `データ取得失敗: ${error.message}` },
        { status: 500, headers: cacheHeaders }
      )
    }

    return NextResponse.json(data, { headers: cacheHeaders })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: `リクエスト処理失敗: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500, headers: cacheHeaders }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // フロントエンド形式（startTime等）をDB形式（start_time等）に変換
    const dbData = callHistoryToDbFormat(body)
    
    // 更新対象からIDを除外（更新不可のため）
    delete dbData.id
    delete dbData.created_at
    delete dbData.updated_at

    const { data, error } = await supabase
      .from('架電履歴_全記録')
      .update(dbData)
      .eq('id', params.id)
      .select()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json(
        { error: `データ更新失敗: ${error.message}`, details: error },
        { status: 500, headers: cacheHeaders }
      )
    }

    return NextResponse.json({ success: true, data }, { headers: cacheHeaders })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: `リクエスト処理失敗: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500, headers: cacheHeaders }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('架電履歴_全記録')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Supabase delete error:', error)
      return NextResponse.json(
        { error: `データ削除失敗: ${error.message}` },
        { status: 500, headers: cacheHeaders }
      )
    }

    return NextResponse.json({ success: true }, { headers: cacheHeaders })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: `リクエスト処理失敗: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500, headers: cacheHeaders }
    )
  }
}
