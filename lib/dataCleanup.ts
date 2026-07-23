// 管理者の「データ一括修正」機能で使う正規化ロジック。
// 実際に反映する前に必ずプレビュー(変更前後の一覧)で確認できるようにするため、
// preview/apply の両ルートから同じ関数を呼び、常に同じ結果になるようにしている。

const KANJI_DIGITS: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
}
const KANJI_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }

// GAS/Excel由来のデータには全角数字("123")が混在しているため、\d(半角のみ)で
// マッチさせる前に半角へ変換しておく
function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}

function kanjiToNumber(str: string): number | null {
  let total = 0
  let section = 0
  let num = 0
  for (const ch of str) {
    if (KANJI_DIGITS[ch] !== undefined) {
      num = KANJI_DIGITS[ch]
    } else if (KANJI_UNITS[ch] !== undefined) {
      section += (num || 1) * KANJI_UNITS[ch]
      num = 0
    } else {
      return null
    }
  }
  total = section + num
  return total > 0 ? total : null
}

// 全角の英数字・記号(Unicode "Fullwidth Forms"、U+FF01-FF5E)を半角に変換する。
// この範囲はラテン文字・数字・記号のみでカタカナは含まれないため、
// カナ(ひらがな・カタカナ)はこの変換では一切変化しない(全角のまま保持される)
function toHalfWidthAlnumSymbols(s: string): string {
  return s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}

/**
 * 住所を正規化する。
 * ・空白(前後・間を問わずすべて、全角スペースも含む)を削除する
 * ・全角の英数字・記号を半角に変換する(漢字・ひらがな・カタカナは全角のまま)
 * ・丁目/番地/番/号を漢数字から算用数字に変換したうえで、
 *   「1丁目2番地3号」を「1-2-3」のようにハイフンでつなぐ
 * ・「〇号室」は部屋番号のため変換対象から除外する
 * ・丁目/番地/番/号に隣接しない漢数字(地名など)は変更しない
 */
export function normalizeAddress(input: string | null | undefined): string {
  if (!input) return input || ''
  const ROOM_PLACEHOLDER = ' ROOMNUM '
  let s = toHalfWidthAlnumSymbols(input).replace(/\s+/g, '').split('号室').join(ROOM_PLACEHOLDER)

  s = s.replace(/([一二三四五六七八九十百千]+)(丁目|番地|番|号)/g, (match, kanji: string, unit: string) => {
    const n = kanjiToNumber(kanji)
    return n === null ? match : `${n}${unit}`
  })

  let prev: string
  do {
    prev = s
    s = s
      .replace(/(\d+)丁目(\d+)/g, '$1-$2')
      .replace(/(\d+)(?:番地|番)(\d+)/g, '$1-$2')
      .replace(/(\d+)丁目/g, '$1')
      .replace(/(\d+)(?:番地|番)/g, '$1')
      .replace(/(\d+)号/g, '$1')
  } while (s !== prev)

  s = s.split(ROOM_PLACEHOLDER).join('号室')
  return s
}

/**
 * 企業名を正規化する。
 * ・空白(前後・間を問わずすべて、全角スペースも含む)を削除する
 * ・全角の英数字・記号のみ半角に変換する(漢字・ひらがな・カタカナは全角のまま)
 */
export function normalizeCompanyName(input: string | null | undefined): string {
  if (!input) return input || ''
  return toHalfWidthAlnumSymbols(input).replace(/\s+/g, '')
}

/**
 * 電話番号(固定番号)を正規化する。
 * ・先頭の0が欠落している場合に0を補う(9桁を固定電話10桁に、10桁を携帯番号等11桁に)
 *   日本国内の電話番号は必ず0から始まるため、0以外から始まる9桁・10桁は
 *   Excel等での数値変換により先頭0が落ちたものとみなす
 * ・10桁(0始まり)は 3-3-4、11桁(0始まり、携帯番号等)は 3-4-4 でハイフンを付与
 * ・上記に当てはまらない桁数はそのまま返す(誤変換を避けるため)
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return input || ''
  const digits = toHalfWidthDigits(input).replace(/\D/g, '')
  if (!digits) return input

  let d = digits
  if (!d.startsWith('0') && (d.length === 9 || d.length === 10)) {
    d = '0' + d
  }

  if (d.length === 10 && d.startsWith('0')) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`
  }
  if (d.length === 11 && d.startsWith('0')) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
  }
  return input
}
