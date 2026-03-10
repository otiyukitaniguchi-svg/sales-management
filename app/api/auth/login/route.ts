import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import bcrypt from 'bcrypt'

interface LoginRequestBody {
  username: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json()

    if (!body.username || !body.password) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名とパスワードを入力してください' },
        { status: 400 }
      )
    }

    // Fetch user from database
    const { data: users, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('username', body.username)
      .limit(1)

    if (error) {
      throw error
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名またはパスワードが間違っています' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(body.password, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'ユーザー名またはパスワードが間違っています' },
        { status: 401 }
      )
    }

    // Return user info (without password hash)
    const { password_hash, ...userInfo } = user

    return NextResponse.json({
      success: true,
      user: userInfo,
      message: 'ログイン成功',
    })
  } catch (error: any) {
    console.error('Error in login:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
