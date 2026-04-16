export const dynamic = "force-dynamic"
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('架電履歴_全記録')
      .insert([body])
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: `データ作成失敗: ${error.message}` },
        { status: 500, headers: cacheHeaders }
      )
    }

    return NextResponse.json(data, { status: 201, headers: cacheHeaders })
  } catch (error) {
    console.error('Request error:', error)
    return NextResponse.json(
      { error: `リクエスト処理失敗: ${error instanceof Error ? error.message : '不明なエラー'}` },
      { status: 500, headers: cacheHeaders }
    )
  }
}
