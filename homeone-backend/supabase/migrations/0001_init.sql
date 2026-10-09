-- ============================================================================
-- HOMEONE - 0001_init.sql
-- Auth + registration + verification schema for Supabase PostgreSQL.
-- Apply with: supabase db push   (or paste into Supabase Studio -> SQL Editor)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Shared trigger: keep updated_at honest
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- profiles - mirrors auth.users, one row per account
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name            text NOT NULL,
  mobile_number        text,
  email                text NOT NULL,
  profile_photo_path   text,
  is_email_verified    boolean NOT NULL DEFAULT false,
  is_mobile_verified   boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_full_name_len CHECK (char_length(full_name) BETWEEN 2 AND 120),
  CONSTRAINT profiles_mobile_len CHECK (
    mobile_number IS NULL OR mobile_number ~ '^\+?[0-9]{7,15}$'
  )
);

CREATE INDEX IF NOT EXISTS profiles_mobile_number_idx ON public.profiles (mobile_number);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- user_roles - exactly one active role per account
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('CUSTOMER', 'PROFESSIONAL', 'ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles (role);

-- ----------------------------------------------------------------------------
-- customer_homes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_homes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label       text,
  address     text NOT NULL,
  latitude    double precision,
  longitude   double precision,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_homes_lat CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  CONSTRAINT customer_homes_lng CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180))
);

CREATE INDEX IF NOT EXISTS customer_homes_customer_id_idx ON public.customer_homes (customer_id);

DROP TRIGGER IF EXISTS customer_homes_updated_at ON public.customer_homes;
CREATE TRIGGER customer_homes_updated_at
  BEFORE UPDATE ON public.customer_homes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Only one default home per customer.
CREATE UNIQUE INDEX IF NOT EXISTS customer_homes_one_default_idx
  ON public.customer_homes (customer_id) WHERE is_default;

-- ----------------------------------------------------------------------------
-- service_domains / services catalog
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_domains (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id    uuid NOT NULL REFERENCES public.service_domains (id) ON DELETE CASCADE,
  service_name text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain_id, service_name)
);

CREATE INDEX IF NOT EXISTS services_domain_id_idx ON public.services (domain_id);

-- ----------------------------------------------------------------------------
-- service_providers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_providers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  domain_id           uuid NOT NULL REFERENCES public.service_domains (id) ON DELETE RESTRICT,
  years_of_experience integer NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0),
  languages_spoken    text[] NOT NULL DEFAULT '{}',
  business_address    text NOT NULL,
  latitude            double precision,
  longitude           double precision,
  has_certificate     boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'PENDING'
                        CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED')),
  verification_reason text,
  verified_at         timestamptz,
  submitted_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_providers_lat CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  CONSTRAINT service_providers_lng CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180))
);

CREATE INDEX IF NOT EXISTS service_providers_status_idx ON public.service_providers (verification_status);
CREATE INDEX IF NOT EXISTS service_providers_domain_idx ON public.service_providers (domain_id);

DROP TRIGGER IF EXISTS service_providers_updated_at ON public.service_providers;
CREATE TRIGGER service_providers_updated_at
  BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- provider_skills (many-to-many provider <-> services)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers (id) ON DELETE CASCADE,
  service_id  uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  UNIQUE (provider_id, service_id)
);

CREATE INDEX IF NOT EXISTS provider_skills_provider_idx ON public.provider_skills (provider_id);

-- ----------------------------------------------------------------------------
-- provider_documents (private storage paths only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       uuid NOT NULL REFERENCES public.service_providers (id) ON DELETE CASCADE,
  document_type     text NOT NULL CHECK (document_type IN ('GOVERNMENT_ID', 'CERTIFICATE', 'WORK_PHOTO')),
  storage_path      text NOT NULL,
  original_filename text,
  mime_type         text,
  size_bytes        bigint,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_documents_provider_idx ON public.provider_documents (provider_id);
CREATE INDEX IF NOT EXISTS provider_documents_type_idx ON public.provider_documents (document_type);

-- ----------------------------------------------------------------------------
-- provider_working_hours
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_working_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  UNIQUE (provider_id, day_of_week, start_time),
  CONSTRAINT provider_working_hours_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS provider_working_hours_provider_idx
  ON public.provider_working_hours (provider_id);

-- ----------------------------------------------------------------------------
-- provider_verification_history (audit log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_verification_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.service_providers (id) ON DELETE CASCADE,
  old_status  text CHECK (old_status IS NULL OR old_status IN ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED')),
  new_status  text NOT NULL CHECK (new_status IN ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED')),
  reason      text,
  reviewed_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_verification_history_provider_idx
  ON public.provider_verification_history (provider_id, reviewed_at DESC);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title             text NOT NULL,
  message           text NOT NULL,
  notification_type text NOT NULL DEFAULT 'GENERAL',
  is_read           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id) WHERE NOT is_read;

-- ============================================================================
-- Row Level Security
-- Passwords and OTPs stay inside auth.users / auth schema and are never
-- mirrored here. The backend uses the service role key; these policies are the
-- second line of defence if the publishable key ever touches a table directly.
-- ============================================================================

ALTER TABLE public.profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_homes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_domains            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_skills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_working_hours     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications              ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_professional()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'PROFESSIONAL'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- profiles: read/edit own row, admin reads all
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- user_roles: readable by owner and admin; only service role may write
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- customer_homes: owner only
DROP POLICY IF EXISTS customer_homes_own ON public.customer_homes;
CREATE POLICY customer_homes_own ON public.customer_homes
  FOR ALL USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

-- catalogs are public read
DROP POLICY IF EXISTS service_domains_public_read ON public.service_domains;
CREATE POLICY service_domains_public_read ON public.service_domains
  FOR SELECT USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read ON public.services
  FOR SELECT USING (is_active OR public.is_admin());

-- service_providers: owner or admin
DROP POLICY IF EXISTS service_providers_select ON public.service_providers;
CREATE POLICY service_providers_select ON public.service_providers
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS service_providers_update ON public.service_providers;
CREATE POLICY service_providers_update ON public.service_providers
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS service_providers_insert ON public.service_providers;
CREATE POLICY service_providers_insert ON public.service_providers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- skills / working hours follow provider ownership
DROP POLICY IF EXISTS provider_skills_select ON public.provider_skills;
CREATE POLICY provider_skills_select ON public.provider_skills
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS provider_skills_write ON public.provider_skills;
CREATE POLICY provider_skills_write ON public.provider_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS provider_working_hours_select ON public.provider_working_hours;
CREATE POLICY provider_working_hours_select ON public.provider_working_hours
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS provider_working_hours_write ON public.provider_working_hours;
CREATE POLICY provider_working_hours_write ON public.provider_working_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

-- provider_documents: owner professional or admin reviewer
DROP POLICY IF EXISTS provider_documents_select ON public.provider_documents;
CREATE POLICY provider_documents_select ON public.provider_documents
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS provider_documents_write ON public.provider_documents;
CREATE POLICY provider_documents_write ON public.provider_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

-- verification history: provider sees own, admin sees all, nobody writes directly
DROP POLICY IF EXISTS provider_verification_history_select
  ON public.provider_verification_history;
CREATE POLICY provider_verification_history_select
  ON public.provider_verification_history
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

-- notifications: owner only
DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());