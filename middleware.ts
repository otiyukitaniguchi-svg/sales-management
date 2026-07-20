import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

// /api/line/webhook はLINEサーバーから直接呼ばれるためセッションCookieを持たない。
// 署名検証(LINE_CHANNEL_SECRET)をルート側で行うためここでは認証を除外する。
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/line/webhook']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_API_PATHS.some((path) => pathname === path)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    return NextResponse.json(
      { success: false, message: '認証が必要です' },
      { status: 401 }
    )
  }

  const headers = new Headers(request.headers)
  headers.set('x-user-id', session.sub)
  headers.set('x-user-role', session.role)
  // HTTPヘッダー値はLatin1(ByteString)である必要があるため、日本語の表示名等はURIエンコードして渡す
  headers.set('x-user-name', encodeURIComponent(session.displayName))
  headers.set('x-user-username', encodeURIComponent(session.username))

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/api/:path*'],
}
