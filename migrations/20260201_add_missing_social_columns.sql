-- Migration: Add Missing Columns to Social Posts
-- Date: 2026-02-01
-- Description: Adds uploader_id, creator_id, uploader_type, and time columns. Enabling RLS.

ALTER TABLE social_posts 
ADD COLUMN IF NOT EXISTS uploader_id uuid,
ADD COLUMN IF NOT EXISTS creator_id uuid,
ADD COLUMN IF NOT EXISTS uploader_type text,
ADD COLUMN IF NOT EXISTS time text;

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso Publico App" ON social_posts;

CREATE POLICY "Acceso Publico App" ON social_posts FOR ALL USING (true) WITH CHECK (true);
