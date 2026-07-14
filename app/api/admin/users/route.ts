export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  const { data, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('id, username, display_name, role, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, users: data })
}

export async function POST(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  try {
    const body = await request.json()
    const { username, displayName, password, role } = body

    if (!username || !displayName || !password) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名・表示名・パスワードは必須です' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .insert({
        username,
        display_name: displayName,
        password_hash: passwordHash,
        role: role || 'user',
      })
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
