export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { sendOrderToLine } from '@/lib/line'
import { FrontendCustomerRecord, FrontendCallHistoryEntry } from '@/lib/types'

interface LineNotifyRequestBody {
  record: FrontendCustomerRecord
  callEntry: FrontendCallHistoryEntry
}

export async function POST(request: NextRequest) {
  try {
    const body: LineNotifyRequestBody = await request.json()

    if (!body.record || !body.callEntry) {
      return NextResponse.json(
        { success: false, message: 'レコードまたは架電情報が不足しています' },
        { status: 400 }
      )
    }

    const sent = await sendOrderToLine(body.record, body.callEntry)

    return NextResponse.json({
      success: sent,
      message: sent ? 'LINE通知を送信しました' : 'LINE通知の送信に失敗しました(未設定の可能性があります)',
    })
  } catch (error: any) {
    console.error('Error in LINE notification:', error)
    return NextResponse.json(
      { success: false, message: error.message || '不明なエラー' },
      { status: 500 }
    )
  }
}
