-- Sunrise Dashboard — Supabase Schema
-- Ejecutar en: Supabase > SQL Editor

-- ─── TASKS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('Prospección','Contenido','Ventas','Automatización','Admin')),
  done        BOOLEAN NOT NULL DEFAULT false,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reset tasks diariamente (se hace desde el frontend filtrando por fecha)
-- Las tareas del día anterior simplemente no aparecen al filtrar por fecha de hoy

-- ─── REVENUE ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  client      TEXT,
  month       TEXT NOT NULL, -- YYYY-MM
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── LEADS / PIPELINE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  company      TEXT,
  channel      TEXT NOT NULL DEFAULT 'Instagram',
  service      TEXT NOT NULL DEFAULT 'Automatización',
  status       TEXT NOT NULL DEFAULT 'Nuevo'
                CHECK (status IN ('Nuevo','Contactado','Demo','Propuesta','Negociación','Cerrado')),
  last_contact DATE NOT NULL DEFAULT CURRENT_DATE,
  amount       NUMERIC(10,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RLS (Row Level Security) — desactivado para uso personal ────────────────
-- Si quieres añadir auth más adelante, habilita RLS y crea políticas

ALTER TABLE tasks   DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads   DISABLE ROW LEVEL SECURITY;

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tasks_date_idx ON tasks (date);
CREATE INDEX IF NOT EXISTS revenue_created_idx ON revenue (created_at);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
