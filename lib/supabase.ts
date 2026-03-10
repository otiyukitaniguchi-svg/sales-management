import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database table names
export const TABLES = {
  LIST1: '新規リスト',
  LIST2: 'ハルエネリスト',
  LIST3: 'モバイルリスト',
  CALL_HISTORY: '架電履歴_全記録',
  USERS: 'users'
} as const

// List type mapping
export const LIST_TYPE_MAP = {
  list1: TABLES.LIST1,
  list2: TABLES.LIST2,
  list3: TABLES.LIST3,
} as const

export type ListType = keyof typeof LIST_TYPE_MAP

// Helper function to get table name from list ID
export function getTableName(listId: ListType): string {
  return LIST_TYPE_MAP[listId]
}
