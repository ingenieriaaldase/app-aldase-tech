-- Migration: Add Stats Columns to Social Posts
-- Date: 2026-02-01
-- Description: Adds JSONB columns for 24h and 1w statistics to social_posts table.

ALTER TABLE social_posts 
ADD COLUMN IF NOT EXISTS stats_24h jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS stats_1w jsonb DEFAULT '{}'::jsonb;
