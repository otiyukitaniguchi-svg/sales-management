-- ============================================================
-- リスト読み込み高速化: 架電件数をDB側で集計するRPC関数
--
-- 今までは /api/lists/[listId] を開くたびに「そのリストの架電履歴を
-- 全件(no列だけ)まるごと取得してNode.js側で件数を数える」という処理を
-- していたため、架電履歴が増えるほどリスト切替・初回読み込みが遅くなっていた。
-- この関数はPostgres側でGROUP BYして「No.ごとの件数」だけを返すので、
-- 既存インデックス(idx_架電履歴_list_no)を使って高速に集計できる。
--
-- 実行方法: Supabaseダッシュボード → SQL Editor に全文貼り付けて実行。
-- ============================================================

CREATE OR REPLACE FUNCTION get_call_counts(p_list_types text[])
RETURNS TABLE(no text, cnt bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT 架電履歴_全記録.no, COUNT(*)::bigint AS cnt
  FROM 架電履歴_全記録
  WHERE list_type = ANY(p_list_types)
  GROUP BY 架電履歴_全記録.no;
$$;

-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ get_call_counts関数を作成しました。リストの読み込みが速くなります。';
END $$;
