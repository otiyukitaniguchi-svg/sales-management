-- ============================================================
-- ステップ2: インデックス作成（検索速度を向上）
-- ============================================================

-- 新規リストのインデックス
CREATE INDEX IF NOT EXISTS idx_新規リスト_no ON 新規リスト(no);
CREATE INDEX IF NOT EXISTS idx_新規リスト_company_name ON 新規リスト(company_name);
CREATE INDEX IF NOT EXISTS idx_新規リスト_updated_at ON 新規リスト(updated_at);

-- ハルエネリストのインデックス
CREATE INDEX IF NOT EXISTS idx_ハルエネリスト_no ON ハルエネリスト(no);
CREATE INDEX IF NOT EXISTS idx_ハルエネリスト_company_name ON ハルエネリスト(company_name);
CREATE INDEX IF NOT EXISTS idx_ハルエネリスト_updated_at ON ハルエネリスト(updated_at);

-- モバイルリストのインデックス
CREATE INDEX IF NOT EXISTS idx_モバイルリスト_no ON モバイルリスト(no);
CREATE INDEX IF NOT EXISTS idx_モバイルリスト_company_name ON モバイルリスト(company_name);
CREATE INDEX IF NOT EXISTS idx_モバイルリスト_updated_at ON モバイルリスト(updated_at);

-- 架電履歴のインデックス
CREATE INDEX IF NOT EXISTS idx_架電履歴_list_type ON 架電履歴_全記録(list_type);
CREATE INDEX IF NOT EXISTS idx_架電履歴_no ON 架電履歴_全記録(no);
CREATE INDEX IF NOT EXISTS idx_架電履歴_operator ON 架電履歴_全記録(operator);
CREATE INDEX IF NOT EXISTS idx_架電履歴_date ON 架電履歴_全記録(date);
CREATE INDEX IF NOT EXISTS idx_架電履歴_progress ON 架電履歴_全記録(progress);
CREATE INDEX IF NOT EXISTS idx_架電履歴_created_at ON 架電履歴_全記録(created_at);
CREATE INDEX IF NOT EXISTS idx_架電履歴_list_no ON 架電履歴_全記録(list_type, no);

-- ユーザーのインデックス
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 完了メッセージ
SELECT 'ステップ2完了: インデックス作成成功' AS status;
