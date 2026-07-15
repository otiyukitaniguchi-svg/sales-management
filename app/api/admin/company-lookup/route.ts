export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { requireAdmin } from '@/lib/auth'

// 国税庁 法人番号システムWeb-API (v4) を使った企業名検索。
// 参考: https://www.houjin-bangou.nta.go.jp/webapi/
//
// 注意: このエンドポイントは実際のアプリケーションIDでの疎通確認が
// まだできていない(HOUJIN_BANGOU_APP_ID未登録のため)。CSVのカラム名は
// 公式ドキュメントの記載に基づいているが、実際のレスポンスで動作確認が
// 取れ次第、必要であれば調整すること。
const NTA_BASE_URL = 'https://api.houjin-bangou.nta.go.jp/4/name'

interface CompanyCandidate {
  houjinBangou: string
  name: string
  kana?: string
  zipCode?: string
  address?: string
}

export async function GET(request: NextRequest) {
  const adminError = requireAdmin(request)
  if (adminError) return adminError

  const appId = process.env.HOUJIN_BANGOU_APP_ID
  if (!appId) {
    return NextResponse.json(
      {
        success: false,
        message:
          'HOUJIN_BANGOU_APP_ID が設定されていません。国税庁「法人番号システムWeb-API」への登録後、環境変数を設定してください(https://www.houjin-bangou.nta.go.jp/webapi/)',
      },
      { status: 501 }
    )
  }

  const name = request.nextUrl.searchParams.get('name')
  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, message: '検索する企業名を入力してください' }, { status: 400 })
  }

  try {
    const url = new URL(NTA_BASE_URL)
    url.searchParams.set('id', appId)
    url.searchParams.set('name', name.trim())
    url.searchParams.set('type', '12') // 12 = CSV (UTF-8)
    url.searchParams.set('mode', '2') // 2 = 部分一致
    url.searchParams.set('history', '0') // 0 = 閉鎖等の履歴を含めない

    const ntaResponse = await fetch(url.toString())

    if (!ntaResponse.ok) {
      return NextResponse.json(
        { success: false, message: `法人番号APIエラー: HTTP ${ntaResponse.status}` },
        { status: 502 }
      )
    }

    const csvText = await ntaResponse.text()
    const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })

    const candidates: CompanyCandidate[] = (parsed.data || []).map((row) => ({
      houjinBangou: row['法人番号'] || '',
      name: row['商号又は名称'] || '',
      kana: row['商号又は名称のフリガナ'] || row['検索対象法人番号'] || undefined,
      zipCode: row['郵便番号'] || undefined,
      address: row['本店又は主たる事務所の所在地'] || undefined,
    })).filter((c) => c.houjinBangou && c.name)

    return NextResponse.json({ success: true, candidates, raw: parsed.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `検索中にエラーが発生しました: ${error.message || '不明なエラー'}` },
      { status: 500 }
    )
  }
}
