export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { sendOrderToSlack } from '@/lib/slack'
import { FrontendCustomerRecord, FrontendCallHistoryEntry } from '@/lib/types'

interface SlackNotifyRequestBody {
  record: FrontendCustomerRecord
  callEntry: FrontendCallHistoryEntry
}

export async function POST(request: NextRequest) {
  try {
    const body: SlackNotifyRequestBody = await request.json()

    if (!body.record || !body.callEntry) {
      return NextResponse.json(
        { success: false, message: 'レコードまたは架電情報が不足しています' },
        { status: 400 }
      )
    }

    const sent = await sendOrderToSlack(body.record, body.callEntry)

    return NextResponse.json({
      success: sent,
      message: sent ? 'Slack通知を送信しました' : 'Slack通知の送信に失敗しました',
    })
  } catch (error: any) {
    console.error('Error in slack notification:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
