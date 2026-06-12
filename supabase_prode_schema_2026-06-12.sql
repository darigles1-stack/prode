-- =============================================================
-- SUPABASE / POSTGRESQL SCHEMA - Prode BanCo Corrientes
-- Generado automáticamente el 11/6/2026
-- Instrucciones:
--   1. Ir a tu proyecto en https://supabase.com
--   2. Abrir SQL Editor y pegar este script completo
--   3. Ejecutar con "Run"
-- =============================================================

-- Habilitar extensión uuid si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABLA: profiles (Usuarios del torneo)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  uid           TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  photo_url     TEXT,
  points        INTEGER NOT NULL DEFAULT 0,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  legajo        TEXT,
  gerencia      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- =============================================================
-- TABLA: matches (Fixture de partidos)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  match_date    TIMESTAMPTZ NOT NULL,
  home_score    INTEGER,
  away_score    INTEGER,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'finished')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- =============================================================
-- TABLA: forecasts (Pronósticos de usuarios)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.forecasts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  user_name     TEXT NOT NULL,
  user_email    TEXT NOT NULL,
  match_id      TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score    INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 99),
  away_score    INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 99),
  points_earned INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  UNIQUE(user_id, match_id)
);

-- =============================================================
-- ÍNDICES para mejorar performance en consultas frecuentes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_forecasts_user_id  ON public.forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_match_id ON public.forecasts(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_date       ON public.matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status     ON public.matches(status);

-- =============================================================
-- TRIGGER: Crear perfil automático cuando el usuario se registra
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (uid, name, email, photo_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (uid) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- ROW LEVEL SECURITY (RLS) - Equivalente a las reglas de Firestore
-- =============================================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

-- profiles: cualquier usuario logueado puede ver, solo puede editar el suyo
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid()::TEXT = uid)
  WITH CHECK (auth.uid()::TEXT = uid);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::TEXT = uid);

-- matches: cualquier usuario logueado puede ver; solo admins pueden escribir
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "matches_admin_write" ON public.matches
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE uid = auth.uid()::TEXT AND is_admin = TRUE)
  );

-- forecasts: todos pueden ver; solo el propio usuario puede crear/editar
-- y solamente hasta 5 minutos antes del inicio del partido
CREATE POLICY "forecasts_select" ON public.forecasts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "forecasts_insert_own_before_lock" ON public.forecasts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::TEXT = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND NOW() < m.match_date - INTERVAL '5 minutes'
    )
  );

CREATE POLICY "forecasts_update_own_before_lock" ON public.forecasts
  FOR UPDATE TO authenticated
  USING (auth.uid()::TEXT = user_id)
  WITH CHECK (
    auth.uid()::TEXT = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND NOW() < m.match_date - INTERVAL '5 minutes'
    )
  );

CREATE POLICY "forecasts_delete_own_before_lock" ON public.forecasts
  FOR DELETE TO authenticated
  USING (
    auth.uid()::TEXT = user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND NOW() < m.match_date - INTERVAL '5 minutes'
    )
  );

-- Admins pueden actualizar pronósticos para asentar puntos
CREATE POLICY "forecasts_admin_update" ON public.forecasts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE uid = auth.uid()::TEXT AND is_admin = TRUE)
  );

-- =============================================================
-- FIN DEL SCRIPT
-- Próximos pasos:
--   1. Habilitá Google como proveedor de Auth en Supabase > Authentication > Providers
--   2. Instalá el cliente: npm install @supabase/supabase-js
--   3. Configurá las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
-- =============================================================
