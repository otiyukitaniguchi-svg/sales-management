import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  sub: string
  username: string
  displayName: string
  role: string
}

function getSecretKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(user: SessionPayload): Promise<string> {
  return new SignJWT({ username: user.username, displayName: user.displayName, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (!payload.sub || typeof payload.username !== 'string' || typeof payload.role !== 'string') {
      return null
    }
    return {
      sub: payload.sub,
      username: payload.username,
      displayName: (payload.displayName as string) || '',
      role: payload.role,
    }
  } catch {
    return null
  }
}

// ミドルウェアで検証済みのセッションから role を読み取り、管理者以外を弾く
export function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json(
      { success: false, message: '管理者権限が必要です', error: '管理者権限が必要です' },
      { status: 403 }
    )
  }
  return null
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
}
