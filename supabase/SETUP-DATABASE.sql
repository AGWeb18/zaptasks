-- ============================================================================
-- ZapTasks Database Setup Script
-- ============================================================================
-- This script creates all tables, indexes, RLS policies, and triggers
-- for the ZapTasks marketplace.
--
-- Run this script in your Supabase SQL Editor to set up the database.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'sub', '')
$$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Providers (helpers who offer services)
CREATE TABLE IF NOT EXISTS providers (
  user_id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  services JSONB DEFAULT '[]'::JSONB,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Platform admins
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Job requests (posted by homeowners)
CREATE TABLE IF NOT EXISTS job_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id TEXT,
  homeowner_name TEXT,
  homeowner_email TEXT,
  job_title TEXT NOT NULL,
  services TEXT[] NOT NULL,
  description TEXT,
  service_date DATE,
  service_time TEXT,
  hours INTEGER,
  people INTEGER,
  bring_equipment BOOLEAN DEFAULT FALSE,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  budget_type TEXT,
  budget_amount NUMERIC,
  budget_notes TEXT,
  contact_preference TEXT,
  selected_provider_id TEXT,
  selected_provider_name TEXT,
  selected_application_id UUID,
  agreed_total_amount NUMERIC,
  deposit_amount NUMERIC,
  remainder_amount NUMERIC,
  deposit_invoice_id TEXT,
  deposit_invoice_url TEXT,
  remainder_invoice_id TEXT,
  remainder_invoice_url TEXT,
  status TEXT DEFAULT 'open',
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Job applications (providers applying to jobs)
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id UUID REFERENCES job_requests(id) ON DELETE CASCADE,
  provider_id TEXT,
  provider_name TEXT,
  provider_email TEXT,
  message TEXT,
  proposed_rate NUMERIC,
  proposed_rate_type TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  audience TEXT,
  type TEXT,
  payload JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ============================================================================
-- PAYMENT & ESCROW TABLES
-- ============================================================================

-- Jobs (active jobs after application accepted)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id UUID REFERENCES job_requests(id) ON DELETE SET NULL,
  homeowner_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  provider_stripe_account_id TEXT,
  total_amount_cents INTEGER NOT NULL,
  escrow_amount_cents INTEGER NOT NULL,
  escrow_percentage INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  platform_fee_rate NUMERIC NOT NULL,
  milestone_plan JSONB,
  job_status TEXT NOT NULL DEFAULT 'pending',
  completion_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Job milestones (for large multi-payment jobs)
CREATE TABLE IF NOT EXISTS job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  percentage INTEGER,
  amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(stripe_payment_intent_id)
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  reason TEXT,
  evidence JSONB,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Payment logs (audit trail)
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ============================================================================
-- REVIEWS & COMMUNICATION TABLES
-- ============================================================================

-- Provider reviews (submitted by homeowners after job completion)
CREATE TABLE IF NOT EXISTS provider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  homeowner_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_type TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(job_id, homeowner_id)
);

-- Conversations (between two users)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1 TEXT NOT NULL,
  user2 TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user1, user2)
);

-- Messages (in conversations)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS jobs_homeowner_idx ON jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS jobs_provider_idx ON jobs(provider_id);
CREATE INDEX IF NOT EXISTS payments_job_idx ON payments(job_id);
CREATE INDEX IF NOT EXISTS disputes_job_idx ON disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations (user1, user2);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Normalize conversation users (always store in consistent order)
CREATE OR REPLACE FUNCTION normalize_conversation_users()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user1 > NEW.user2 THEN
    DECLARE
      temp TEXT := NEW.user1;
    BEGIN
      NEW.user1 := NEW.user2;
      NEW.user2 := temp;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_normalize_conversation_users ON conversations;
CREATE TRIGGER trig_normalize_conversation_users
  BEFORE INSERT ON conversations
  FOR EACH ROW EXECUTE FUNCTION normalize_conversation_users();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- === job_requests ==========================================================
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homeowners_manage_own_job_requests" ON public.job_requests;
CREATE POLICY "homeowners_manage_own_job_requests"
  ON public.job_requests
  FOR ALL
  USING (public.current_user_id() = homeowner_id)
  WITH CHECK (public.current_user_id() = homeowner_id);

-- This policy was removed (2026-07): it exposed homeowner email and exact
-- street address to any client. Providers get the job board exclusively
-- through GET /api/job-requests?scope=open, which masks that PII. The DROP
-- is kept here so re-running this setup script on an older database clears
-- the policy instead of recreating it.
DROP POLICY IF EXISTS "anyone_can_view_open_job_requests" ON public.job_requests;

DROP POLICY IF EXISTS "selected_provider_can_view_job_requests" ON public.job_requests;
CREATE POLICY "selected_provider_can_view_job_requests"
  ON public.job_requests
  FOR SELECT
  USING (public.current_user_id() = selected_provider_id);

-- === job_applications ======================================================
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers_view_their_applications" ON public.job_applications;
CREATE POLICY "providers_view_their_applications"
  ON public.job_applications
  FOR SELECT
  USING (public.current_user_id() = provider_id);

DROP POLICY IF EXISTS "providers_create_job_applications" ON public.job_applications;
CREATE POLICY "providers_create_job_applications"
  ON public.job_applications
  FOR INSERT
  WITH CHECK (
    public.current_user_id() = provider_id
    AND EXISTS (
      SELECT 1
      FROM public.job_requests
      WHERE job_requests.id = job_applications.job_request_id
        AND job_requests.status = 'open'
        AND job_requests.homeowner_id <> public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "providers_update_pending_applications" ON public.job_applications;
CREATE POLICY "providers_update_pending_applications"
  ON public.job_applications
  FOR UPDATE
  USING (
    public.current_user_id() = provider_id
    AND status = 'pending'
  )
  WITH CHECK (
    public.current_user_id() = provider_id
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "providers_delete_pending_applications" ON public.job_applications;
CREATE POLICY "providers_delete_pending_applications"
  ON public.job_applications
  FOR DELETE
  USING (
    public.current_user_id() = provider_id
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "homeowners_view_job_applications" ON public.job_applications;
CREATE POLICY "homeowners_view_job_applications"
  ON public.job_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_requests
      WHERE job_requests.id = job_applications.job_request_id
        AND job_requests.homeowner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "homeowners_update_job_application_status" ON public.job_applications;
CREATE POLICY "homeowners_update_job_application_status"
  ON public.job_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_requests
      WHERE job_requests.id = job_applications.job_request_id
        AND job_requests.homeowner_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.job_requests
      WHERE job_requests.id = job_applications.job_request_id
        AND job_requests.homeowner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "homeowners_delete_job_applications" ON public.job_applications;
CREATE POLICY "homeowners_delete_job_applications"
  ON public.job_applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_requests
      WHERE job_requests.id = job_applications.job_request_id
        AND job_requests.homeowner_id = public.current_user_id()
    )
  );

-- === notifications =========================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_their_notifications" ON public.notifications;
CREATE POLICY "users_view_their_notifications"
  ON public.notifications
  FOR SELECT
  USING (
    public.current_user_id() = user_id
    OR audience IN ('public', 'global')
  );

DROP POLICY IF EXISTS "users_update_their_notifications" ON public.notifications;
CREATE POLICY "users_update_their_notifications"
  ON public.notifications
  FOR UPDATE
  USING (public.current_user_id() = user_id)
  WITH CHECK (public.current_user_id() = user_id);

DROP POLICY IF EXISTS "users_delete_their_notifications" ON public.notifications;
CREATE POLICY "users_delete_their_notifications"
  ON public.notifications
  FOR DELETE
  USING (public.current_user_id() = user_id);

-- === providers =============================================================
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_can_view_providers" ON public.providers;
CREATE POLICY "anyone_can_view_providers"
  ON public.providers
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "providers_manage_their_profile" ON public.providers;
CREATE POLICY "providers_manage_their_profile"
  ON public.providers
  FOR ALL
  USING (public.current_user_id() = user_id)
  WITH CHECK (public.current_user_id() = user_id);

-- === platform_admins =======================================================
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_platform_admins" ON public.platform_admins;
CREATE POLICY "service_role_manage_platform_admins"
  ON public.platform_admins
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "authenticated_read_platform_admins" ON public.platform_admins;
CREATE POLICY "authenticated_read_platform_admins"
  ON public.platform_admins
  FOR SELECT
  USING (true);

-- === jobs ==================================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homeowners_manage_jobs" ON public.jobs;
CREATE POLICY "homeowners_manage_jobs"
  ON public.jobs
  FOR ALL
  USING (public.current_user_id() = homeowner_id)
  WITH CHECK (public.current_user_id() = homeowner_id);

DROP POLICY IF EXISTS "providers_view_assigned_jobs" ON public.jobs;
CREATE POLICY "providers_view_assigned_jobs"
  ON public.jobs
  FOR SELECT
  USING (public.current_user_id() = provider_id);

DROP POLICY IF EXISTS "admins_manage_jobs" ON public.jobs;
CREATE POLICY "admins_manage_jobs"
  ON public.jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  );

-- === job_milestones ========================================================
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_milestones FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homeowners_manage_job_milestones" ON public.job_milestones;
CREATE POLICY "homeowners_manage_job_milestones"
  ON public.job_milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = job_milestones.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = job_milestones.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "providers_view_job_milestones" ON public.job_milestones;
CREATE POLICY "providers_view_job_milestones"
  ON public.job_milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = job_milestones.job_id
        AND jobs.provider_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "admins_manage_job_milestones" ON public.job_milestones;
CREATE POLICY "admins_manage_job_milestones"
  ON public.job_milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  );

-- === payments ==============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_manage_payments" ON public.payments;
CREATE POLICY "participants_manage_payments"
  ON public.payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = payments.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = payments.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "providers_view_payments" ON public.payments;
CREATE POLICY "providers_view_payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = payments.job_id
        AND jobs.provider_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "admins_manage_payments" ON public.payments;
CREATE POLICY "admins_manage_payments"
  ON public.payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  );

-- === disputes ==============================================================
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homeowners_manage_disputes" ON public.disputes;
CREATE POLICY "homeowners_manage_disputes"
  ON public.disputes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = disputes.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = disputes.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "providers_view_disputes" ON public.disputes;
CREATE POLICY "providers_view_disputes"
  ON public.disputes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = disputes.job_id
        AND jobs.provider_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "admins_manage_disputes" ON public.disputes;
CREATE POLICY "admins_manage_disputes"
  ON public.disputes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  );

-- === payment_logs ==========================================================
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_manage_payment_logs" ON public.payment_logs;
CREATE POLICY "participants_manage_payment_logs"
  ON public.payment_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = payment_logs.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = payment_logs.job_id
        AND jobs.homeowner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "providers_view_payment_logs" ON public.payment_logs;
CREATE POLICY "providers_view_payment_logs"
  ON public.payment_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = payment_logs.job_id
        AND jobs.provider_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "admins_manage_payment_logs" ON public.payment_logs;
CREATE POLICY "admins_manage_payment_logs"
  ON public.payment_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = public.current_user_id()
    )
  );

-- === provider_reviews ======================================================
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reviews FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homeowners_review_own_jobs" ON public.provider_reviews;
CREATE POLICY "homeowners_review_own_jobs"
  ON public.provider_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs WHERE jobs.id = provider_reviews.job_id AND jobs.homeowner_id = public.current_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs WHERE jobs.id = provider_reviews.job_id AND jobs.homeowner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "providers_view_own_reviews" ON public.provider_reviews;
CREATE POLICY "providers_view_own_reviews"
  ON public.provider_reviews
  FOR SELECT
  USING (public.current_user_id() = provider_id);

DROP POLICY IF EXISTS "anyone_view_reviews" ON public.provider_reviews;
CREATE POLICY "anyone_view_reviews"
  ON public.provider_reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "admins_manage_reviews" ON public.provider_reviews;
CREATE POLICY "admins_manage_reviews"
  ON public.provider_reviews
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = public.current_user_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = public.current_user_id())
  );

-- === conversations =========================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_view_conversations" ON public.conversations;
CREATE POLICY "participants_view_conversations"
  ON public.conversations
  FOR SELECT
  USING (
    public.current_user_id() = user1 OR public.current_user_id() = user2
  );

DROP POLICY IF EXISTS "participants_manage_conversations" ON public.conversations;
CREATE POLICY "participants_manage_conversations"
  ON public.conversations
  FOR ALL
  USING (
    public.current_user_id() IN (user1, user2)
  )
  WITH CHECK (
    public.current_user_id() IN (user1, user2)
  );

-- === messages ==============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_view_messages" ON public.messages;
CREATE POLICY "participants_view_messages"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND public.current_user_id() IN (conversations.user1, conversations.user2)
    )
  );

DROP POLICY IF EXISTS "senders_insert_messages" ON public.messages;
CREATE POLICY "senders_insert_messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND public.current_user_id() IN (conversations.user1, conversations.user2)
    )
    AND public.current_user_id() = sender
  );

-- ============================================================================
-- STORAGE BUCKETS (for job photos)
-- ============================================================================

-- Note: Run these commands in Supabase Dashboard > Storage
-- or via the Storage API:
--
-- 1. Create bucket 'job-photos' with public access
-- 2. Set RLS policies:
--    - Allow authenticated users to upload
--    - Allow public read access
--
-- Example RLS policies for storage.objects:
--
-- CREATE POLICY "Authenticated users can upload job photos"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'job-photos');
--
-- CREATE POLICY "Anyone can view job photos"
--   ON storage.objects FOR SELECT
--   TO public
--   USING (bucket_id = 'job-photos');

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
--
-- Next steps:
-- 1. Add your user ID to platform_admins table for admin access
-- 2. Configure storage buckets in Supabase Dashboard
-- 3. Test the RLS policies by creating test data
--
-- ============================================================================
