-- ============================================================
-- Supabase Database Schema for Sales Management System
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 新規リスト (list1)
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

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_新規リスト_no ON 新規リスト(no);
CREATE INDEX IF NOT EXISTS idx_新規リスト_company_name ON 新規リスト(company_name);
CREATE INDEX IF NOT EXISTS idx_新規リスト_updated_at ON 新規リスト(updated_at);

-- ============================================================
-- 2. ハルエネリスト (list2)
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

CREATE INDEX IF NOT EXISTS idx_ハルエネリスト_no ON ハルエネリスト(no);
CREATE INDEX IF NOT EXISTS idx_ハルエネリスト_company_name ON ハルエネリスト(company_name);
CREATE INDEX IF NOT EXISTS idx_ハルエネリスト_updated_at ON ハルエネリスト(updated_at);

-- ============================================================
-- 3. モバイルリスト (list3)
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

CREATE INDEX IF NOT EXISTS idx_モバイルリスト_no ON モバイルリスト(no);
CREATE INDEX IF NOT EXISTS idx_モバイルリスト_company_name ON モバイルリスト(company_name);
CREATE INDEX IF NOT EXISTS idx_モバイルリスト_updated_at ON モバイルリスト(updated_at);

-- ============================================================
-- 4. 架電履歴_全記録
-- ============================================================
CREATE TABLE IF NOT EXISTS 架電履歴_全記録 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_type VARCHAR(50) NOT NULL, -- 'list1', 'list2', 'list3'
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

-- Indexes for call history
CREATE INDEX IF NOT EXISTS idx_架電履歴_list_type ON 架電履歴_全記録(list_type);
CREATE INDEX IF NOT EXISTS idx_架電履歴_no ON 架電履歴_全記録(no);
CREATE INDEX IF NOT EXISTS idx_架電履歴_operator ON 架電履歴_全記録(operator);
CREATE INDEX IF NOT EXISTS idx_架電履歴_date ON 架電履歴_全記録(date);
CREATE INDEX IF NOT EXISTS idx_架電履歴_progress ON 架電履歴_全記録(progress);
CREATE INDEX IF NOT EXISTS idx_架電履歴_created_at ON 架電履歴_全記録(created_at);

-- Composite index for fetching history by list and no
CREATE INDEX IF NOT EXISTS idx_架電履歴_list_no ON 架電履歴_全記録(list_type, no);

-- ============================================================
-- 5. ユーザー認証テーブル（簡易版）
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

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================================
-- 6. Functions: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
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
-- 7. Row Level Security (RLS) - Optional
-- ============================================================
-- Enable RLS on all tables
ALTER TABLE 新規リスト ENABLE ROW LEVEL SECURITY;
ALTER TABLE ハルエネリスト ENABLE ROW LEVEL SECURITY;
ALTER TABLE モバイルリスト ENABLE ROW LEVEL SECURITY;
ALTER TABLE 架電履歴_全記録 ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Enable read access for authenticated users" ON 新規リスト
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON ハルエネリスト
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON モバイルリスト
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON 架電履歴_全記録
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Enable all operations for authenticated users" ON 新規リスト
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON ハルエネリスト
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON モバイルリスト
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON 架電履歴_全記録
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 8. Initial Data (Optional)
-- ============================================================
-- Insert default admin user (password: admin123 - please change in production)
-- Password hash generated with bcrypt
INSERT INTO users (username, display_name, password_hash, role)
VALUES ('admin', '管理者', '$2b$10$YourHashedPasswordHere', 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 9. Helper Views
-- ============================================================
-- View to get call history count per record
CREATE OR REPLACE VIEW 新規リスト_with_call_count AS
SELECT 
  l.*,
  COALESCE(COUNT(h.id), 0) as call_history_count
FROM 新規リスト l
LEFT JOIN 架電履歴_全記録 h ON l.no = h.no AND h.list_type = 'list1'
GROUP BY l.id;

CREATE OR REPLACE VIEW ハルエネリスト_with_call_count AS
SELECT 
  l.*,
  COALESCE(COUNT(h.id), 0) as call_history_count
FROM ハルエネリスト l
LEFT JOIN 架電履歴_全記録 h ON l.no = h.no AND h.list_type = 'list2'
GROUP BY l.id;

CREATE OR REPLACE VIEW モバイルリスト_with_call_count AS
SELECT 
  l.*,
  COALESCE(COUNT(h.id), 0) as call_history_count
FROM モバイルリスト l
LEFT JOIN 架電履歴_全記録 h ON l.no = h.no AND h.list_type = 'list3'
GROUP BY l.id;

-- ============================================================
-- 10. Utility Functions
-- ============================================================
-- Function to get all records from a specific list with call history
CREATE OR REPLACE FUNCTION get_list_with_history(list_type_param TEXT)
RETURNS TABLE (
  id UUID,
  no VARCHAR,
  company_name VARCHAR,
  -- ... other fields
  call_history_count BIGINT,
  latest_call_date VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.no,
    l.company_name,
    COUNT(h.id)::BIGINT as call_history_count,
    MAX(h.date) as latest_call_date
  FROM 
    CASE 
      WHEN list_type_param = 'list1' THEN 新規リスト
      WHEN list_type_param = 'list2' THEN ハルエネリスト
      WHEN list_type_param = 'list3' THEN モバイルリスト
    END as l
  LEFT JOIN 架電履歴_全記録 h ON l.no = h.no AND h.list_type = list_type_param
  GROUP BY l.id, l.no, l.company_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE 新規リスト IS '新規顧客リスト';
COMMENT ON TABLE ハルエネリスト IS 'ハルエネ顧客リスト';
COMMENT ON TABLE モバイルリスト IS 'モバイル顧客リスト';
COMMENT ON TABLE 架電履歴_全記録 IS '全架電履歴の永続記録';
COMMENT ON TABLE users IS 'ユーザー認証情報';
