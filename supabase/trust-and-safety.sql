-- Trust & safety schema additions (see TRUST-AND-SAFETY-PLAN.md).
-- Applied to the live project as three migrations, reproduced here verbatim
-- as the durable record: add_provider_trust_columns, add_review_trust_columns,
-- create_reports_and_user_flags.

-- === providers: identity, suspension, cached verification =================
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_checked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_account_status_check;
ALTER TABLE public.providers
  ADD CONSTRAINT providers_account_status_check CHECK (account_status IN ('active', 'suspended'));

ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_bio_length_check;
ALTER TABLE public.providers
  ADD CONSTRAINT providers_bio_length_check CHECK (bio IS NULL OR char_length(bio) <= 500);

-- Supabase grants full table privileges to anon/authenticated by default and
-- relies on RLS for row-level restriction, but RLS cannot restrict which
-- *columns* an UPDATE touches. Without this, the existing
-- "providers_manage_their_profile" FOR ALL policy would let any provider
-- suspend/un-suspend themselves or forge their own verification status via a
-- direct Supabase client call from the browser, bypassing the app entirely.
REVOKE UPDATE ON public.providers FROM authenticated, anon;
GRANT UPDATE (stripe_account_id, services, location, display_name, photo_url, bio)
  ON public.providers TO authenticated;

-- === provider_reviews: verified-payment flag, provider right-of-reply =====
ALTER TABLE public.provider_reviews
  ADD COLUMN IF NOT EXISTS verified_payment BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider_response TEXT,
  ADD COLUMN IF NOT EXISTS provider_response_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.provider_reviews
  DROP CONSTRAINT IF EXISTS provider_reviews_response_length_check;
ALTER TABLE public.provider_reviews
  ADD CONSTRAINT provider_reviews_response_length_check
    CHECK (provider_response IS NULL OR char_length(provider_response) <= 1000);

-- verified_payment must never be settable by a client (homeowner or
-- provider) directly -- it is only ever written by trusted server code
-- (the review route, via the service-role client) after independently
-- confirming a captured payment exists for the job. This closes the same
-- direct-client-bypass risk as the providers column lockdown above.
REVOKE INSERT (verified_payment), UPDATE (verified_payment)
  ON public.provider_reviews FROM authenticated, anon;

-- Previously "homeowners_review_own_jobs" was FOR ALL with only a job-
-- ownership check, which meant a homeowner could bypass the app's payment
-- gate entirely by inserting a 5-star review directly against an unpaid,
-- cancelled job via a raw Supabase client call. There is also no
-- edit/delete-review feature in the app, so UPDATE/DELETE are dropped
-- entirely for homeowners (least privilege) rather than carried forward.
DROP POLICY IF EXISTS "homeowners_review_own_jobs" ON public.provider_reviews;

DROP POLICY IF EXISTS "homeowners_view_own_reviews" ON public.provider_reviews;
CREATE POLICY "homeowners_view_own_reviews"
  ON public.provider_reviews
  FOR SELECT
  USING (public.current_user_id() = homeowner_id);

DROP POLICY IF EXISTS "homeowners_insert_reviews" ON public.provider_reviews;
CREATE POLICY "homeowners_insert_reviews"
  ON public.provider_reviews
  FOR INSERT
  WITH CHECK (
    public.current_user_id() = homeowner_id
    AND EXISTS (
      SELECT 1 FROM public.jobs WHERE jobs.id = provider_reviews.job_id AND jobs.homeowner_id = public.current_user_id()
    )
    -- A star rating requires a captured payment on the job. Reviews without
    -- a rating (NULL) are still allowed on any owned job so a homeowner can
    -- flag a no-show/issue on a job that was cancelled before payment.
    AND (
      rating IS NULL
      OR EXISTS (
        SELECT 1 FROM public.payments
        WHERE payments.job_id = provider_reviews.job_id
          AND (payments.status = 'succeeded' OR payments.captured_at IS NOT NULL)
      )
    )
  );

-- Providers may respond to their own review exactly once. USING is checked
-- against the pre-update row, so "provider_response IS NULL" there means a
-- row with an existing response can never be targeted again.
DROP POLICY IF EXISTS "providers_respond_to_own_reviews" ON public.provider_reviews;
CREATE POLICY "providers_respond_to_own_reviews"
  ON public.provider_reviews
  FOR UPDATE
  USING (public.current_user_id() = provider_id AND provider_response IS NULL)
  WITH CHECK (public.current_user_id() = provider_id);

REVOKE UPDATE ON public.provider_reviews FROM authenticated, anon;
GRANT UPDATE (provider_response, provider_response_at) ON public.provider_reviews TO authenticated;

-- === reports ================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('job_request', 'review', 'message', 'user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_details_length_check;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_details_length_check CHECK (details IS NULL OR char_length(details) <= 2000);

CREATE INDEX IF NOT EXISTS reports_reporter_idx ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_target_idx ON public.reports(target_type, target_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reporters_insert_own_reports" ON public.reports;
CREATE POLICY "reporters_insert_own_reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (public.current_user_id() = reporter_id);

DROP POLICY IF EXISTS "reporters_view_own_reports" ON public.reports;
CREATE POLICY "reporters_view_own_reports"
  ON public.reports
  FOR SELECT
  USING (public.current_user_id() = reporter_id);

DROP POLICY IF EXISTS "admins_manage_reports" ON public.reports;
CREATE POLICY "admins_manage_reports"
  ON public.reports
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = public.current_user_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = public.current_user_id())
  );

-- Reports are only ever written by the reporter (INSERT) or admins; nobody
-- should be able to edit an existing report's contents once filed.
REVOKE UPDATE ON public.reports FROM authenticated, anon;

-- === user_flags (homeowner suspension) =====================================
-- Minimal suspension flag for homeowners. There is no dedicated homeowners
-- table (job_requests.homeowner_id is just a Clerk id), so this is a
-- standalone flag table keyed by Clerk user id, checked at post/apply/award
-- time. Row is only ever written by an admin (service role); no client
-- writes are permitted at all.
CREATE TABLE IF NOT EXISTS public.user_flags (
  user_id TEXT PRIMARY KEY,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE public.user_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_user_flags" ON public.user_flags;
CREATE POLICY "admins_manage_user_flags"
  ON public.user_flags
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = public.current_user_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = public.current_user_id())
  );

DROP POLICY IF EXISTS "users_view_own_flag" ON public.user_flags;
CREATE POLICY "users_view_own_flag"
  ON public.user_flags
  FOR SELECT
  USING (public.current_user_id() = user_id);
