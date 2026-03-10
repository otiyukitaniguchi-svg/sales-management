-- ============================================================
-- ステップ3: トリガー作成（自動でupdated_atを更新）
-- ============================================================

-- トリガー関数を作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを追加
DROP TRIGGER IF EXISTS update_新規リスト_updated_at ON 新規リスト;
CREATE TRIGGER update_新規リスト_updated_at
  BEFORE UPDATE ON 新規リスト
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ハルエネリスト_updated_at ON ハルエネリスト;
CREATE TRIGGER update_ハルエネリスト_updated_at
  BEFORE UPDATE ON ハルエネリスト
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_モバイルリスト_updated_at ON モバイルリスト;
CREATE TRIGGER update_モバイルリスト_updated_at
  BEFORE UPDATE ON モバイルリスト
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_架電履歴_updated_at ON 架電履歴_全記録;
CREATE TRIGGER update_架電履歴_updated_at
  BEFORE UPDATE ON 架電履歴_全記録
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 完了メッセージ
SELECT 'ステップ3完了: トリガー作成成功' AS status;
