-- Migration: Add Comments to Tasks
-- Date: 2026-01-24
-- Description: Adds comments column to tasks table to store array of comment objects.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;
