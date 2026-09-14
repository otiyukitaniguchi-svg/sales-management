export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

// 表示順を入れ替えるAPI。並べ替え後の順番でリストIDを渡すと、
// 配列のインデックス(0始まり)をそのままsort_orderとして振り直す。
export async function PUT(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string')) {
      return NextResponse.json({ success: false, message: '並び順のリストIDが不正です' }, { status: 400 })
    }

    const results = await Promise.all(
      ids.map((id: string, index: number) =>
        supabaseAdmin.from(TABLES.LISTS).update({ sort_order: index }).eq('id', id)
      )
    )

    const failed = results.find((r) => r.error)
    if (failed?.error) {
      return NextResponse.json({ success: false, message: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
