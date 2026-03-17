-- ============================================================
-- 架電履歴_全記録 テーブルの再定義（CSVインポート対応）
-- ============================================================

-- 既存テーブルを削除
DROP TABLE IF EXISTS 架電履歴_全記録 CASCADE;

-- 新しいテーブルを作成（CSVの列順に合わせる）
CREATE TABLE 架電履歴_全記録 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  no VARCHAR(50) NOT NULL,
  list_type VARCHAR(50) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  address VARCHAR(500),
  operator_name VARCHAR(100),
  date VARCHAR(50),
  start_time VARCHAR(50),
  end_time VARCHAR(50),
  responder VARCHAR(100),
  gender VARCHAR(20),
  progress VARCHAR(50),
  note TEXT,
  operator VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX idx_架電履歴_list_type ON 架電履歴_全記録(list_type);
CREATE INDEX idx_架電履歴_no ON 架電履歴_全記録(no);
CREATE INDEX idx_架電履歴_list_no ON 架電履歴_全記録(list_type, no);
CREATE INDEX idx_架電履歴_date ON 架電履歴_全記録(date);
CREATE INDEX idx_架電履歴_created_at ON 架電履歴_全記録(created_at DESC);

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION update_架電履歴_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_架電履歴_updated_at
  BEFORE UPDATE ON 架電履歴_全記録
  FOR EACH ROW
  EXECUTE FUNCTION update_架電履歴_updated_at();

-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 架電履歴_全記録 テーブルの更新が完了しました！';
END $$;
