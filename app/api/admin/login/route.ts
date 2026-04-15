
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('Admin login API: POST request received');
  
  try {
    const body = await request.json();
    console.log('Admin login API: Request body parsed', { hasPassword: !!body.password });
    
    const { password } = body;
    const ADMIN_PASSWORD = 'any123'; 

    if (password === ADMIN_PASSWORD) {
      console.log('Admin login API: Authentication successful');
      return new NextResponse(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Admin login API: Authentication failed - Invalid password');
      return new NextResponse(JSON.stringify({ authenticated: false, error: 'Invalid password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Admin login API: Fatal error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(JSON.stringify({ authenticated: false, error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
