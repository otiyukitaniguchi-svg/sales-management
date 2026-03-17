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

    const { data, error } = await supabase
      .from('架電履歴_全記録')
      .update(body)
      .eq('id', params.id)
      .select()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json(
        { error: `データ更新失敗: ${error.message}` },
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
