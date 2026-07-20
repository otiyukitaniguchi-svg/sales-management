import { FrontendCustomerRecord, FrontendCallHistoryEntry } from './types'

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push'

/**
 * 受注通知をLINEグループに送信する(Messaging APIのpush message)
 */
export async function sendOrderToLine(
  record: FrontendCustomerRecord,
  callEntry: FrontendCallHistoryEntry
): Promise<boolean> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const groupId = process.env.LINE_GROUP_ID

  if (!accessToken || !groupId) {
    console.log('LINE channel access token or group ID not configured')
    return false
  }

  const contact = record.fixedNo || record.otherContact || '-'

  const text =
    `《 AP受注通知》\n` +
    `No: ${record.no}/企業名: ${record.companyName || '-'}\n` +
    `架電担当者: ${callEntry.operator || '-'}\n` +
    `顧客対応者: ${callEntry.responder || '-'}\n` +
    `連絡先：${contact}\n` +
    `備考: ${callEntry.note || '-'}`

  try {
    const response = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text }],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`LINE API error: ${response.status} ${body}`)
    }

    console.log('✅ LINE notification sent successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to send LINE notification:', error)
    return false
  }
}
