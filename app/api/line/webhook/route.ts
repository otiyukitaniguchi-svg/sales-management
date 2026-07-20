export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// LINE Developersのwebhook URLとして登録する。グループIDを取得するための診断用途も兼ねる:
// このグループでメッセージが送信されると、そのgroupIdがVercelのログに出力される。
// 取得後はLINE_GROUP_ID環境変数に設定すればよい(このエンドポイント自体は残しておいて問題ない)。
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-line-signature') || ''
  const channelSecret = process.env.LINE_CHANNEL_SECRET

  if (channelSecret) {
    const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest('base64')
    if (expected !== signature) {
      console.warn('[LINE webhook] signature mismatch')
      return NextResponse.json({ success: false }, { status: 401 })
    }
  }

  try {
    const body = JSON.parse(rawBody)
    for (const event of body.events || []) {
      const sourceType = event.source?.type
      const groupId = event.source?.groupId
      const userId = event.source?.userId
      console.log(`[LINE webhook] sourceType=${sourceType} groupId=${groupId || '-'} userId=${userId || '-'}`)
    }
  } catch (e) {
    console.error('[LINE webhook] Failed to parse body:', e)
  }

  return NextResponse.json({ success: true })
}
