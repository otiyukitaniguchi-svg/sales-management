export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

// このミリ秒以上前のロックは、ブラウザクラッシュ等で解除されずに残った
// 「放置ロック」とみなし、他のユーザーが上書きできるようにする
const STALE_MS = 30 * 60 * 1000

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const rawUserName = request.headers.get('x-user-name')
    const userName = rawUserName ? decodeURIComponent(rawUserName) : ''
    if (!userId) {
      return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 })
    }

    const { listSlug, no } = await request.json()
    if (!listSlug || !no) {
      return NextResponse.json({ success: false, message: 'listSlug/noが指定されていません' }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from(TABLES.CALL_LOCKS)
      .select('*')
      .eq('list_slug', listSlug)
      .eq('no', no)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existing) {
      const isOwnLock = existing.user_id === userId
      const isStale = Date.now() - new Date(existing.started_at).getTime() > STALE_MS
      if (!isOwnLock && !isStale) {
        return NextResponse.json({
          success: false,
          lockedBy: existing.user_name,
          startedAt: existing.started_at,
        })
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from(TABLES.CALL_LOCKS)
      .upsert(
        { list_slug: listSlug, no, user_id: userId, user_name: userName, started_at: new Date().toISOString() },
        { onConflict: 'list_slug,no' }
      )

    if (upsertError) throw upsertError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in calls/lock:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
