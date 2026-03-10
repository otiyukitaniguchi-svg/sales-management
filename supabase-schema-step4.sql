-- ============================================================
-- ステップ4: Row Level Security (RLS) とコメント追加
-- ============================================================

-- RLSを有効化（セキュリティ強化）
ALTER TABLE 新規リスト ENABLE ROW LEVEL SECURITY;
ALTER TABLE ハルエネリスト ENABLE ROW LEVEL SECURITY;
ALTER TABLE モバイルリスト ENABLE ROW LEVEL SECURITY;
ALTER TABLE 架電履歴_全記録 ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ポリシー作成：認証済みユーザーは全データにアクセス可能
DROP POLICY IF EXISTS "Enable all for authenticated users" ON 新規リスト;
CREATE POLICY "Enable all for authenticated users" ON 新規リスト
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON ハルエネリスト;
CREATE POLICY "Enable all for authenticated users" ON ハルエネリスト
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON モバイルリスト;
CREATE POLICY "Enable all for authenticated users" ON モバイルリスト
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON 架電履歴_全記録;
CREATE POLICY "Enable all for authenticated users" ON 架電履歴_全記録
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
CREATE POLICY "Enable read for authenticated users" ON users
  FOR SELECT USING (true);

-- テーブルにコメント追加
COMMENT ON TABLE 新規リスト IS '新規顧客リスト';
COMMENT ON TABLE ハルエネリスト IS 'ハルエネ顧客リスト';
COMMENT ON TABLE モバイルリスト IS 'モバイル顧客リスト';
COMMENT ON TABLE 架電履歴_全記録 IS '全架電履歴の永続記録';
COMMENT ON TABLE users IS 'ユーザー認証情報';

-- 完了メッセージ
SELECT 'ステップ4完了: セキュリティ設定完了' AS status;
