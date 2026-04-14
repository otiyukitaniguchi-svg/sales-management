
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // 環境変数からパスワードを取得することを推奨
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'any123'; 

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ authenticated: true });
    } else {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin login API error:', error);
    return NextResponse.json({ authenticated: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
