import { FrontendCustomerRecord, FrontendCallHistoryEntry } from './types'

interface SlackMessage {
  text?: string
  blocks?: any[]
}

/**
 * Send order notification to Slack
 */
export async function sendOrderToSlack(
  record: FrontendCustomerRecord,
  callEntry: FrontendCallHistoryEntry
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.log('Slack webhook URL not configured')
    return false
  }

  try {
    const message: SlackMessage = {
      text: '🎉 受注が発生しました！',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎉 受注通知',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*企業名:*\n${record.companyName || '-'}`,
            },
            {
              type: 'mrkdwn',
              text: `*担当者:*\n${callEntry.operator || '-'}`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*No:*\n${record.no}`,
            },
            {
              type: 'mrkdwn',
              text: `*日時:*\n${callEntry.date} ${callEntry.startTime}`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*応対者:*\n${callEntry.responder || '-'}`,
            },
            {
              type: 'mrkdwn',
              text: `*備考:*\n${callEntry.note || '-'}`,
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `営業管理システムより自動送信`,
            },
          ],
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`)
    }

    console.log('✅ Slack notification sent successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error)
    return false
  }
}

/**
 * Send custom message to Slack
 */
export async function sendSlackMessage(text: string): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.log('Slack webhook URL not configured')
    return false
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`)
    }

    return true
  } catch (error) {
    console.error('Failed to send Slack message:', error)
    return false
  }
}
