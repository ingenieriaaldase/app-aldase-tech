
-- HABILITAR RLS (Row Level Security)
-- Esto protege las tablas para que solo se pueda acceder mediante políticas especificas.

-- 1. Habilitar RLS en todas las tablas principales
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- 2. Crear Políticas de Acceso (Policies)

-- A) Política "Permisiva" (Recomendada si usas el Login actual/Legacy)
-- Permite lectura/escritura a cualquiera que tenga la API Key "Anon" (tu app).
-- Esto evita que sea público "a todo internet", pero confía en tu Client Key.
CREATE POLICY "Acceso Publico App" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON workers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON tasks FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON time_entries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON financial_documents FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON meetings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON project_documents FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON company_configs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON leads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON social_posts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Acceso Publico App" ON calendar_events FOR ALL TO anon USING (true) WITH CHECK (true);


-- B) Política "Estricta" (Solo si cambias a Supabase Auth real)
-- Descomenta esto y borra las de arriba cuando uses usuarios reales de Supabase.
/*
CREATE POLICY "Solo Autenticados" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Repetir para el resto...
*/

-- TABLA: project_notes (Notas de proyectos)
CREATE TABLE IF NOT EXISTS project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text NOT NULL DEFAULT 'GENERAL',
  author_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso Publico App" ON project_notes FOR ALL TO anon USING (true) WITH CHECK (true);
