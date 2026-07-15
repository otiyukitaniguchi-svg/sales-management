export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent, isGoogleCalendarConfigured } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Googleカレンダー連携が未設定です(GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_CALENDAR_ID)。管理者に設定を依頼してください。',
      },
      { status: 501 }
    )
  }

  try {
    const body = await request.json()
    const { title, description, date, startTime, endTime } = body as {
      title?: string
      description?: string
      date?: string
      startTime?: string
      endTime?: string
    }

    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: 'タイトル・日付・開始時刻・終了時刻は必須です' },
        { status: 400 }
      )
    }

    const result = await createCalendarEvent({ title, description, date, startTime, endTime })

    return NextResponse.json({ success: true, htmlLink: result.htmlLink })
  } catch (error: any) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { success: false, message: `カレンダー登録に失敗しました: ${error.message || '不明なエラー'}` },
      { status: 500 }
    )
  }
}
