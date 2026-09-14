export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

const STALE_MS = 30 * 60 * 1000

// 現在有効な架電中ロックの一覧を返す。listSlugを指定すればそのリストのみ、
// 省略すれば全リスト分(検索結果一覧のように複数リストにまたがる場合に使う)
export async function GET(request: NextRequest) {
  try {
    const listSlug = request.nextUrl.searchParams.get('listSlug')

    let query = supabaseAdmin.from(TABLES.CALL_LOCKS).select('*')
    if (listSlug) query = query.eq('list_slug', listSlug)

    const { data, error } = await query
    if (error) throw error

    const cutoff = Date.now() - STALE_MS
    const active = (data || []).filter((row) => new Date(row.started_at).getTime() >= cutoff)

    return NextResponse.json({
      success: true,
      locks: active.map((row) => ({
        listSlug: row.list_slug,
        no: row.no,
        userId: row.user_id,
        userName: row.user_name,
        startedAt: row.started_at,
      })),
    })
  } catch (error: any) {
    console.error('Error in calls/locks:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
