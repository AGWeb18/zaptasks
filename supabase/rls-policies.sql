-- Row Level Security policies for Supabase tables
-- This file enables RLS and defines access controls for core marketplace tables.

-- Ensure the pgcrypto extension is available when running locally
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- === job_requests ==========================================================
ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homeowners_manage_own_job_requests" ON public.job_requests;
CREATE POLICY "homeowners_manage_own_job_requests"
  ON public.job_requests
  FOR ALL
  USING (public.current_user_id() = homeowner_id)
  WITH CHECK (public.current_user_id() = homeowner_id);

DROP POLICY IF EXISTS "anyone_can_view_open_job_requests" ON public.job_requests;
CREATE POLICY "anyone_can_view_open_job_requests"
  ON public.job_requests
  FOR SELECT
  USING (status = 'open');

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
