-- RÈPLICA COMPLETA DEL ESQUEMA DE BASE DE DATOS
-- Copia y pega este script en el Editor SQL de tu nuevo proyecto Supabase.

-- 1. TIPOS ENUMERADOS (ENUMS)
-- Creación de tipos personalizados utilizados en las tablas.

CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'WORKER');
CREATE TYPE client_type AS ENUM ('ARQUITECTURA', 'PROMOTOR', 'PARTICULAR', 'CONSTRUCTORA', 'INSTALADORA');
CREATE TYPE project_status AS ENUM ('PLANIFICACION', 'EN_CURSO', 'PAUSADO', 'COMPLETADO', 'ENTREGADO', 'CANCELADO');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE meeting_type AS ENUM ('PROYECTO', 'GENERAL', 'CLIENTE');
CREATE TYPE lead_status AS ENUM ('NUEVO', 'CONTACTADO', 'REUNION', 'PROPUESTA', 'GANADO', 'PERDIDO');
CREATE TYPE social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'TWITTER', 'YOUTUBE', 'BLOG');
CREATE TYPE post_status AS ENUM ('IDEA', 'BORRADOR', 'PROGRAMADO', 'PUBLICADO');

-- 2. TABLAS PRINCIPALES (Sin dependencias externas)

-- Tabla: workers (Trabajadores / Usuarios)
CREATE TABLE workers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    role user_role DEFAULT 'WORKER'::user_role,
    avatar_url text,
    surnames text,
    hourly_rate numeric DEFAULT 0,
    phone text,
    joined_date timestamptz DEFAULT now(),
    active boolean DEFAULT true,
    password text -- Nota: Para autenticación simple local
);

-- Tabla: clients (Clientes)
CREATE TABLE clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    cif text,
    address text,
    city text,
    province text,
    zip_code text,
    type client_type,
    contact_name text,
    email text,
    phone text,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Tabla: company_configs (Configuración de la Empresa)
CREATE TABLE company_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    cif text,
    address text,
    phone text,
    email text,
    logo_url text,
    invoice_sequence integer DEFAULT 1,
    quote_sequence integer DEFAULT 1,
    design_categories text[],
    event_types text[],
    project_types text[] DEFAULT ARRAY['Vivienda Unifamiliar', 'Reformas', 'Terciario', 'Industrial', 'Obra Civil', 'Instalaciones'],
    task_categories text[] DEFAULT ARRAY['Oficina', 'Visita Obra', 'Reunión', 'Administrativo', 'Organización', 'Formación', 'Calculo', 'Delineación', 'Diseño'],
    city text,
    province text,
    zip_code text,
    default_terms text,
    default_quote_terms text,
    default_invoice_terms text,
    gdpr_text text,
    iban text
);

-- Tabla: leads (Clientes Potenciales)
CREATE TABLE leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    city text,
    province text,
    source text,
    status lead_status DEFAULT 'NUEVO'::lead_status,
    notes text,
    value numeric,
    created_at timestamptz DEFAULT now(),
    last_contact_date timestamptz
);

-- Tabla: social_posts (Publicaciones Redes Sociales)
CREATE TABLE social_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text,
    platform social_platform,
    date timestamptz,
    status post_status DEFAULT 'IDEA'::post_status,
    media_url text,
    hashtags text,
    likes integer DEFAULT 0,
    stats_24h jsonb DEFAULT '{}'::jsonb,
    stats_1w jsonb DEFAULT '{}'::jsonb,
    uploader_id uuid,
    creator_id uuid,
    uploader_type text,
    time text
);

-- Habilitar RLS para social_posts y permitir acceso público (según migración existente)
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso Publico App" ON social_posts FOR ALL USING (true) WITH CHECK (true);


-- 3. TABLAS CON DEPENDENCIAS

-- Tabla: projects (Proyectos) - Depende de Clients y Workers (Manager)
CREATE TABLE projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL,
    name text NOT NULL,
    client_id uuid REFERENCES clients(id),
    linked_quote_id uuid, -- Se enlazará después si es necesario
    type text,
    manager_id uuid REFERENCES workers(id),
    status project_status DEFAULT 'PLANIFICACION'::project_status,
    start_date timestamptz,
    delivery_date timestamptz,
    budget numeric DEFAULT 0,
    costs numeric DEFAULT 0,
    description text,
    location text,
    address text,
    city text,
    province text,
    zip_code text,
    created_at timestamptz DEFAULT now()
);

-- Tabla: tasks (Tareas) - Depende de Projects y Workers
CREATE TABLE tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES projects(id),
    title text NOT NULL,
    description text,
    status task_status DEFAULT 'TODO'::task_status,
    assignee_id uuid REFERENCES workers(id),
    due_date timestamptz,
    estimated_hours numeric,
    created_at timestamptz DEFAULT now(),
    comments jsonb DEFAULT '[]'::jsonb
);

-- Tabla: task_comments (Comentarios de Tareas - Modelo Relacional Alternativo)
CREATE TABLE task_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES tasks(id),
    text text NOT NULL,
    author_id uuid REFERENCES workers(id),
    created_at timestamptz DEFAULT now()
);

-- Tabla: time_entries (Imputación de Horas) - Depende de Workers y Projects
CREATE TABLE time_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id uuid REFERENCES workers(id),
    project_id uuid REFERENCES projects(id),
    task_type text,
    date timestamptz,
    hours numeric NOT NULL,
    description text,
    sub_category text,
    hourly_rate_snapshot numeric
);

-- Tabla: project_documents (Documentos de Proyecto) - Depende de Projects
CREATE TABLE project_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES projects(id),
    name text NOT NULL,
    url text NOT NULL,
    type text,
    category text,
    upload_date timestamptz DEFAULT now(),
    size text
);

-- Tabla: financial_documents (Facturas y Presupuestos) - Depende de Projects y Clients
CREATE TABLE financial_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    doc_type text CHECK (doc_type IN ('INVOICE', 'QUOTE')),
    number text NOT NULL,
    client_id uuid REFERENCES clients(id),
    project_id uuid REFERENCES projects(id),
    date timestamptz,
    expiry_date timestamptz,
    base_amount numeric DEFAULT 0,
    iva_rate numeric DEFAULT 0.21,
    iva_amount numeric DEFAULT 0,
    total_amount numeric DEFAULT 0,
    status text, -- 'PENDIENTE', 'PAGADA', 'VENCIDA', 'ACEPTADO', 'RECHAZADO', 'ENVIADO'
    paid_date timestamptz,
    payment_method text,
    concepts jsonb DEFAULT '[]'::jsonb, -- Almacena las líneas directamente
    terms text,
    description text
);

-- Tabla: financial_concepts (Conceptos Financieros - Modelo Relacional Opcional)
-- Se mantiene por compatibilidad si se usaba antes del JSONB
CREATE TABLE financial_concepts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    financial_document_id uuid REFERENCES financial_documents(id),
    description text,
    quantity numeric,
    price numeric
);

-- Tabla: meetings (Reuniones) - Depende de Projects
CREATE TABLE meetings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    type meeting_type,
    project_id uuid REFERENCES projects(id),
    date timestamptz,
    duration_minutes integer,
    location text,
    agenda text,
    minutes text, -- Acta
    completed boolean DEFAULT false
);

-- Tabla Join: meeting_attendees (Asistentes a Reuniones)
CREATE TABLE meeting_attendees (
    meeting_id uuid REFERENCES meetings(id),
    worker_id uuid REFERENCES workers(id),
    PRIMARY KEY (meeting_id, worker_id)
);

-- Tabla: calendar_events (Eventos de Calendario) - Depende de Projects
CREATE TABLE calendar_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    date timestamptz,
    end_date timestamptz,
    type text,
    project_id uuid REFERENCES projects(id),
    all_day boolean DEFAULT false,
    attendees text[] -- IDs de workers como array de texto (alternativa simple)
);

-- Tabla Join: event_attendees (Asistentes a Eventos - Modelo Relacional)
CREATE TABLE event_attendees (
    event_id uuid REFERENCES calendar_events(id),
    worker_id uuid REFERENCES workers(id),
    PRIMARY KEY (event_id, worker_id)
);

-- DATOS INICIALES (OPCIONAL)
-- Insertar una configuración de empresa por defecto para evitar errores en la app
INSERT INTO company_configs (name, invoice_sequence, quote_sequence)
VALUES ('Mi Empresa', 1, 1);

