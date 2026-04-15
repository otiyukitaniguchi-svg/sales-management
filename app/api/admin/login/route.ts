
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;
    const ADMIN_PASSWORD = 'any123'; 

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ authenticated: true });
    } else {
      return NextResponse.json({ authenticated: false, error: 'Invalid password' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      authenticated: false, 
      error: error?.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
