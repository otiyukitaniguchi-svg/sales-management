export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { username, displayName, password, role } = body

    const updates: Record<string, any> = {}
    if (username !== undefined) updates.username = username
    if (displayName !== undefined) updates.display_name = displayName
    if (role !== undefined) updates.role = role
    if (password) updates.password_hash = await bcrypt.hash(password, 10)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: '更新項目がありません' }, { status: 400 })
    }

    // 自分自身の役割を admin から降格させることは禁止(最後の管理者ロックアウト防止の一環)
    if (role !== undefined && role !== 'admin' && request.headers.get('x-user-id') === params.id) {
      return NextResponse.json(
        { success: false, message: '自分自身の権限は変更できません' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update(updates)
      .eq('id', params.id)
      .select('id, username, display_name, role, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'このユーザー名は既に使用されています' },
          { status: 409 }
        )
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  if (request.headers.get('x-user-id') === params.id) {
    return NextResponse.json(
      { success: false, message: '自分自身のアカウントは削除できません' },
      { status: 400 }
    )
  }

  const { data: target, error: fetchError } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('role')
    .eq('id', params.id)
    .single()

  if (fetchError || !target) {
    return NextResponse.json({ success: false, message: 'ユーザーが見つかりません' }, { status: 404 })
  }

  if (target.role === 'admin') {
    const { count, error: countError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (countError) {
      return NextResponse.json({ success: false, message: countError.message }, { status: 500 })
    }
    if ((count || 0) <= 1) {
      return NextResponse.json(
        { success: false, message: '最後の管理者アカウントは削除できません' },
        { status: 400 }
      )
    }
  }

  const { error } = await supabaseAdmin.from(TABLES.USERS).delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
