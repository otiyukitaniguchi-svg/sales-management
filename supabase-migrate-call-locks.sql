-- ============================================================
-- 架電中ロック機能のためのテーブル追加
-- 誰かが「開始」を押して架電中のレコードは、他のスタッフが同じ
-- レコードを開いたときに「◯◯さんが架電中のためスキップ」と
-- 表示して自動で読み飛ばし、架電が重複しないようにする。
--
-- 実行方法: Supabaseダッシュボード → SQL Editor に全文貼り付けて実行。
-- ============================================================

CREATE TABLE IF NOT EXISTS call_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_slug VARCHAR(50) NOT NULL,
  no VARCHAR(50) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_slug, no)
);

CREATE INDEX IF NOT EXISTS idx_call_locks_list_slug ON call_locks(list_slug);

-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ call_locksテーブルを作成しました。架電中スキップ機能が使えるようになります。';
END $$;
