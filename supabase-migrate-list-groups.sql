-- リストをグループ名で分類する。既存リストは未分類のまま保持する。
ALTER TABLE public.lists ADD COLUMN IF NOT EXISTS group_name text;
