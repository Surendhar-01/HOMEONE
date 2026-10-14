-- ============================================================================
-- HOMEONE - 0003_bookings_reviews.sql
-- Phase 2: bookings, status history, reviews, main categories, availability.
-- Apply with: npm run db:migrate
-- ============================================================================

-- ----------------------------------------------------------------------------
-- main_categories: the seven fixed customer-facing categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.main_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE,
  icon          text NOT NULL DEFAULT '🔧',
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Many-to-many: a domain (e.g. Electrical) can live under several categories.
CREATE TABLE IF NOT EXISTS public.domain_categories (
  domain_id   uuid NOT NULL REFERENCES public.service_domains (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.main_categories (id) ON DELETE CASCADE,
  PRIMARY KEY (domain_id, category_id)
);

CREATE INDEX IF NOT EXISTS domain_categories_category_idx
  ON public.domain_categories (category_id);

INSERT INTO public.main_categories (category_name, icon, sort_order) VALUES
  ('Repair & Maintenance', '🔧', 1),
  ('Cleaning & Hygiene', '🧹', 2),
  ('Construction & Renovation', '🏗️', 3),
  ('Security & Safety', '🔒', 4),
  ('Smart Home & Technology', '🏠', 5),
  ('Water, Energy & Utilities', '💧', 6),
  ('Household & Lifestyle Services', '🛋️', 7)
ON CONFLICT (category_name) DO NOTHING;

-- Domain -> category mapping. Security & Safety and Smart Home start with
-- fewer domains on purpose: empty states are honest, inventing coverage is not.
INSERT INTO public.domain_categories (domain_id, category_id)
SELECT d.id, c.id
FROM (VALUES
  ('Electrical Services', 'Repair & Maintenance'),
  ('Plumbing Services', 'Repair & Maintenance'),
  ('AC & Refrigeration', 'Repair & Maintenance'),
  ('Home Appliance Repair', 'Repair & Maintenance'),
  ('Cleaning Services', 'Cleaning & Hygiene'),
  ('Pest Control', 'Cleaning & Hygiene'),
  ('Carpentry Services', 'Construction & Renovation'),
  ('Painting Services', 'Construction & Renovation'),
  ('Interior Design', 'Construction & Renovation'),
  ('Electrical Services', 'Smart Home & Technology'),
  ('Solar & Energy', 'Smart Home & Technology'),
  ('Plumbing Services', 'Water, Energy & Utilities'),
  ('Solar & Energy', 'Water, Energy & Utilities'),
  ('Gardening & Lawn Care', 'Household & Lifestyle Services'),
  ('Moving & Packing', 'Household & Lifestyle Services'),
  ('Cleaning Services', 'Household & Lifestyle Services')
) AS v(domain_name, category_name)
JOIN public.service_domains d ON d.domain_name = v.domain_name
JOIN public.main_categories c ON c.category_name = v.category_name
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- Provider availability toggle (Phase B reads this; informational for now)
-- ----------------------------------------------------------------------------
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT true;

-- ----------------------------------------------------------------------------
-- bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider_id         uuid NOT NULL REFERENCES public.service_providers (id) ON DELETE RESTRICT,
  service_id          uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  home_id             uuid REFERENCES public.customer_homes (id) ON DELETE SET NULL,
  address_snapshot    text NOT NULL,
  latitude            double precision,
  longitude           double precision,
  scheduled_at        timestamptz NOT NULL,
  problem_description text NOT NULL,
  urgency             text NOT NULL DEFAULT 'NORMAL'
                        CHECK (urgency IN ('NORMAL', 'HIGH', 'URGENT')),
  status              text NOT NULL DEFAULT 'REQUESTED'
                        CHECK (status IN ('REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED',
                                          'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED')),
  status_updated_at   timestamptz NOT NULL DEFAULT now(),
  idempotency_key     uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_description_len CHECK (char_length(problem_description) BETWEEN 10 AND 2000),
  CONSTRAINT bookings_address_len CHECK (char_length(address_snapshot) BETWEEN 5 AND 500),
  CONSTRAINT bookings_lat CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  CONSTRAINT bookings_lng CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180))
);

-- Retried submissions reuse the client's idempotency key instead of double-booking.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_idx
  ON public.bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_customer_idx ON public.bookings (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_provider_idx ON public.bookings (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- booking_status_history (audit trail for every transition)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  old_status  text,
  new_status  text NOT NULL CHECK (new_status IN ('REQUESTED', 'ACCEPTED', 'REJECTED', 'CANCELLED',
                                                   'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED')),
  changed_by  uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_status_history_booking_idx
  ON public.booking_status_history (booking_id, created_at);

-- ----------------------------------------------------------------------------
-- booking_photos (problem photos, private bucket)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_photos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid NOT NULL REFERENCES public.bookings (id) ON DELETE CASCADE,
  storage_path      text NOT NULL,
  original_filename text,
  mime_type         text,
  size_bytes        bigint,
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_photos_booking_idx ON public.booking_photos (booking_id);

-- ----------------------------------------------------------------------------
-- reviews (exactly one per completed booking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL UNIQUE REFERENCES public.bookings (id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_provider_idx ON public.reviews (provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_customer_idx ON public.reviews (customer_id);

-- ----------------------------------------------------------------------------
-- review_photos (optional, private bucket)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES public.reviews (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- booking-photos bucket (private)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('booking-photos', 'booking-photos', false, 5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "booking_photos_owner_all" ON storage.objects;
CREATE POLICY "booking_photos_owner_all" ON storage.objects
  FOR ALL
  USING (bucket_id = 'booking-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'booking-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Row Level Security. Writes go through the backend (service role); these
-- policies govern direct access and stay deny-by-default for writes.
-- ============================================================================

ALTER TABLE public.main_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS main_categories_public_read ON public.main_categories;
CREATE POLICY main_categories_public_read ON public.main_categories
  FOR SELECT USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS domain_categories_public_read ON public.domain_categories;
CREATE POLICY domain_categories_public_read ON public.domain_categories
  FOR SELECT USING (true);

-- bookings: involved customer, assigned provider, or admin
DROP POLICY IF EXISTS bookings_select_parties ON public.bookings;
CREATE POLICY bookings_select_parties ON public.bookings
  FOR SELECT USING (
    public.is_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

-- history follows the booking
DROP POLICY IF EXISTS booking_status_history_select ON public.booking_status_history;
CREATE POLICY booking_status_history_select ON public.booking_status_history
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.customer_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.service_providers sp
          WHERE sp.id = b.provider_id AND sp.user_id = auth.uid()
        ))
    )
  );

-- booking photos follow the booking
DROP POLICY IF EXISTS booking_photos_select ON public.booking_photos;
CREATE POLICY booking_photos_select ON public.booking_photos
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.customer_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.service_providers sp
          WHERE sp.id = b.provider_id AND sp.user_id = auth.uid()
        ))
    )
  );

-- reviews: the customer who wrote it, the reviewed provider, or admin.
-- Public discovery views are mediated by the backend, which strips customer_id.
DROP POLICY IF EXISTS reviews_select ON public.reviews;
CREATE POLICY reviews_select ON public.reviews
  FOR SELECT USING (
    public.is_admin()
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_providers sp
      WHERE sp.id = provider_id AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS review_photos_select ON public.review_photos;
CREATE POLICY review_photos_select ON public.review_photos
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id
        AND (r.customer_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.service_providers sp
          WHERE sp.id = r.provider_id AND sp.user_id = auth.uid()
        ))
    )
  );