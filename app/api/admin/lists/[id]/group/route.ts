export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(request)
  if (denied) return denied
  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, message: '入力内容が不正です' }, { status: 400 })
  }
  if (typeof body?.groupName !== 'string' || body.groupName.trim().length > 100) {
    return NextResponse.json({ success: false, message: 'グループ名は100文字以内で入力してください' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin.from(TABLES.LISTS)
    .update({ group_name: body.groupName.trim() || null }).eq('id', params.id).select('*').maybeSingle()
  if (error) return NextResponse.json({ success: false, message: error.code === 'PGRST204'
    ? 'グループ機能のデータベース更新が必要です。管理者にお問い合わせください' : error.message }, { status: 500 })
  if (!data) return NextResponse.json({ success: false, message: 'リストが見つかりません' }, { status: 404 })
  return NextResponse.json({ success: true, list: data })
}
