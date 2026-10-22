import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Next.jsはRoute Handler内のfetchをデフォルトでキャッシュすることがあり、
// Supabaseクライアントの内部fetchもその対象になってしまう(更新直後のSELECTが
// 古い結果を返す原因になる)。常にno-storeを強制して無効化する。
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: noStoreFetch },
})

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: { fetch: noStoreFetch },
  }
)

// Database table names
export const TABLES = {
  LISTS: 'lists',
  CUSTOMERS: 'customers',
  CALL_HISTORY: '架電履歴_全記録',
  USERS: 'users',
  CALL_LOCKS: 'call_locks',
} as const

// リストID(list1/list2/list3や新規作成されたslug)は customers.list_slug /
// 架電履歴_全記録.list_type と同じ文字列で、任意の文字列として扱う
export type ListType = string

// 指定したlistIdが実在するリストか確認する(存在しなければnullを返す)
export async function verifyListExists(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient,
  listId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.LISTS)
    .select('slug')
    .eq('slug', listId)
    .maybeSingle()
  return !error && !!data
}

// 全リストを横断して現在の最大Noを求め、そこから続く連番をcount個返す
// (Noはtext列のため数値化して比較する)。新規レコード作成・CSVインポートの
// どちらでも「Noが未入力なら自動採番」を同じ基準で行うための共通処理
export async function getNextGlobalNos(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient,
  count: number
): Promise<string[]> {
  if (count <= 0) return []

  // 1リクエスト最大1000件のため、件数を先に取得してページを並列取得する
  // (直列だと顧客数に比例して遅くなり、インポートがタイムアウトする原因になっていた)。
  // 並列.range()ページが重複/欠落なく分割されるよう一意な(list_slug, no)で並べる
  const pageSize = 1000
  const { count: total, error: countError } = await supabaseAdmin
    .from(TABLES.CUSTOMERS)
    .select('*', { count: 'exact', head: true })
  if (countError) throw countError

  const pageCount = Math.max(1, Math.ceil((total || 0) / pageSize))
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      supabaseAdmin
        .from(TABLES.CUSTOMERS)
        .select('no')
        .order('list_slug', { ascending: true })
        .order('no', { ascending: true })
        .range(i * pageSize, i * pageSize + pageSize - 1)
    )
  )

  let maxNo = 0
  for (const { data, error } of pages) {
    if (error) throw error
    for (const row of data || []) {
      const n = parseInt(row.no, 10)
      if (!isNaN(n) && n > maxNo) maxNo = n
    }
  }

  return Array.from({ length: count }, (_, i) => String(maxNo + 1 + i))
}
