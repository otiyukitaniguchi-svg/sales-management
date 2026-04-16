import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('Admin login API called')
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid Content-Type' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { password } = body
    const ADMIN_PASSWORD = 'any123'

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ authenticated: true })
    } else {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid password' },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('Error in admin login:', error)
    return NextResponse.json(
      {
        authenticated: false,
        error: error?.message || 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
