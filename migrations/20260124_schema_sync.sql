-- Migration: Sync Schema with App Types
-- Date: 2026-01-24
-- Description: Adds missing columns to company_configs, leads, calendar_events, and financial_documents to match TypeScript interfaces.

-- 1. Add missing configuration columns
ALTER TABLE company_configs 
ADD COLUMN IF NOT EXISTS project_types text[] DEFAULT ARRAY['Vivienda Unifamiliar', 'Reformas', 'Terciario', 'Industrial', 'Obra Civil', 'Instalaciones'],
ADD COLUMN IF NOT EXISTS task_categories text[] DEFAULT ARRAY['Oficina', 'Visita Obra', 'Reunión', 'Administrativo', 'Organización', 'Formación', 'Calculo', 'Delineación', 'Diseño'];

-- 2. Add missing Lead columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS province text;

-- 3. Add missing Calendar Event columns
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS attendees text[];

-- 4. Add missing Financial Document columns
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS concepts jsonb DEFAULT '[]'::jsonb;
