import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const id = request.headers.get('x-user-id')
  const role = request.headers.get('x-user-role')
  const rawDisplayName = request.headers.get('x-user-name')
  const rawUsername = request.headers.get('x-user-username')
  const displayName = rawDisplayName ? decodeURIComponent(rawDisplayName) : null
  const username = rawUsername ? decodeURIComponent(rawUsername) : null

  if (!id || !role) {
    return NextResponse.json({ success: false, message: '認証が必要です' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    user: {
      id,
      username: username || '',
      display_name: displayName || '',
      role,
    },
  })
}
