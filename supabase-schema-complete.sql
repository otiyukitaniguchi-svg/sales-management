-- ============================================================
-- Supabase Database Schema - 完全版
-- ============================================================

-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 既存テーブルを削除（クリーンインストール用）
DROP TABLE IF EXISTS 新規リスト CASCADE;
DROP TABLE IF EXISTS ハルエネリスト CASCADE;
DROP TABLE IF EXISTS モバイルリスト CASCADE;
DROP TABLE IF EXISTS 架電履歴_全記録 CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- 1. 新規リスト
-- ============================================================
CREATE TABLE 新規リスト (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no VARCHAR(50) UNIQUE NOT NULL,
  company_kana VARCHAR(255),
  company_name VARCHAR(255),
  fixed_no VARCHAR(50),
  other_contact VARCHAR(255),
  zip_code VARCHAR(20),
  address_kana VARCHAR(500),
  address VARCHAR(500),
  rep_kana VARCHAR(100),
  rep_name VARCHAR(100),
  staff_kana VARCHAR(100),
  staff_name VARCHAR(100),
  email VARCHAR(255),
  industry VARCHAR(100),
  memo TEXT,
  sales VARCHAR(100),
  software VARCHAR(255),
  decision VARCHAR(50),
  subsidy VARCHAR(50),
  accountant VARCHAR(50),
  established VARCHAR(50),
  recall_date VARCHAR(50),
  recall_time VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_新規リスト_no ON 新規リスト(no);
CREATE INDEX idx_新規リスト_company_name ON 新規リスト(company_name);

-- ============================================================
-- 2. ハルエネリスト
-- ============================================================
CREATE TABLE ハルエネリスト (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no VARCHAR(50) UNIQUE NOT NULL,
  company_kana VARCHAR(255),
  company_name VARCHAR(255),
  fixed_no VARCHAR(50),
  other_contact VARCHAR(255),
  zip_code VARCHAR(20),
  address_kana VARCHAR(500),
  address VARCHAR(500),
  rep_kana VARCHAR(100),
  rep_name VARCHAR(100),
  staff_kana VARCHAR(100),
  staff_name VARCHAR(100),
  email VARCHAR(255),
  industry VARCHAR(100),
  memo TEXT,
  sales VARCHAR(100),
  software VARCHAR(255),
  decision VARCHAR(50),
  subsidy VARCHAR(50),
  accountant VARCHAR(50),
  established VARCHAR(50),
  recall_date VARCHAR(50),
  recall_time VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ハルエネリスト_no ON ハルエネリスト(no);
CREATE INDEX idx_ハルエネリスト_company_name ON ハルエネリスト(company_name);

-- ============================================================
-- 3. モバイルリスト
-- ============================================================
CREATE TABLE モバイルリスト (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no VARCHAR(50) UNIQUE NOT NULL,
  company_kana VARCHAR(255),
  company_name VARCHAR(255),
  fixed_no VARCHAR(50),
  other_contact VARCHAR(255),
  zip_code VARCHAR(20),
  address_kana VARCHAR(500),
  address VARCHAR(500),
  rep_kana VARCHAR(100),
  rep_name VARCHAR(100),
  staff_kana VARCHAR(100),
  staff_name VARCHAR(100),
  email VARCHAR(255),
  industry VARCHAR(100),
  memo TEXT,
  sales VARCHAR(100),
  software VARCHAR(255),
  decision VARCHAR(50),
  subsidy VARCHAR(50),
  accountant VARCHAR(50),
  established VARCHAR(50),
  recall_date VARCHAR(50),
  recall_time VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_モバイルリスト_no ON モバイルリスト(no);
CREATE INDEX idx_モバイルリスト_company_name ON モバイルリスト(company_name);

-- ============================================================
-- 4. 架電履歴_全記録
-- ============================================================
CREATE TABLE 架電履歴_全記録 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_type VARCHAR(50) NOT NULL,
  no VARCHAR(50) NOT NULL,
  operator VARCHAR(100),
  date VARCHAR(50),
  start_time VARCHAR(50),
  end_time VARCHAR(50),
  responder VARCHAR(100),
  gender VARCHAR(20),
  progress VARCHAR(50),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_架電履歴_list_type ON 架電履歴_全記録(list_type);
CREATE INDEX idx_架電履歴_no ON 架電履歴_全記録(no);
CREATE INDEX idx_架電履歴_list_no ON 架電履歴_全記録(list_type, no);

-- ============================================================
-- 5. ユーザー
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);

-- ============================================================
-- 6. 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_新規リスト_updated_at
  BEFORE UPDATE ON 新規リスト
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ハルエネリスト_updated_at
  BEFORE UPDATE ON ハルエネリスト
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_モバイルリスト_updated_at
  BEFORE UPDATE ON モバイルリスト
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_架電履歴_updated_at
  BEFORE UPDATE ON 架電履歴_全記録
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 完了メッセージ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ データベーススキーマの作成が完了しました！';
  RAISE NOTICE '次のステップ: 初期ユーザーを作成してください';
END $$;
