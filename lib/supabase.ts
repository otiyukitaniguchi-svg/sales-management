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
  USERS: 'users'
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
