
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('Admin login API called');
  try {
    const body = await request.json();
    console.log('Request body received:', body);
    const { password } = body;

    // 環境変数からパスワードを取得することを推奨
    const ADMIN_PASSWORD = 'any123'; 

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ authenticated: true });
    } else {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin login API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ authenticated: false, error: errorMessage }, { status: 500 });
  }
}
