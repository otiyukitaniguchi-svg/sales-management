-- ============================================================
-- ステップ1: 基本テーブル作成（エラーが出にくい最小構成）
-- ============================================================

-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 新規リスト
-- ============================================================
CREATE TABLE IF NOT EXISTS 新規リスト (
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

-- ============================================================
-- 2. ハルエネリスト
-- ============================================================
CREATE TABLE IF NOT EXISTS ハルエネリスト (
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

-- ============================================================
-- 3. モバイルリスト
-- ============================================================
CREATE TABLE IF NOT EXISTS モバイルリスト (
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

-- ============================================================
-- 4. 架電履歴_全記録
-- ============================================================
CREATE TABLE IF NOT EXISTS 架電履歴_全記録 (
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

-- ============================================================
-- 5. ユーザーテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 完了メッセージ
SELECT 'ステップ1完了: テーブル作成成功' AS status;
