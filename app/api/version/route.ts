export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// Vercelは各デプロイのgit commit SHAを自動でこの環境変数にセットする。
// ローカル開発時など未設定の場合はプロセス起動時刻で代用する(その場合は
// サーバー再起動しない限り値は変わらないため、更新通知は出ない)
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`

export async function GET() {
  return NextResponse.json({ version: VERSION })
}
