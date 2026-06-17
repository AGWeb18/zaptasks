-- Remove the "email" column and add a "location" column to the "providers" table

CREATE TABLE IF NOT EXISTS providers (
  user_id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  services JSONB DEFAULT '[]'::JSONB,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- If you want to update the structure for each service in the providers table:
-- (Assuming services is a JSONB column)

-- No migration needed if you just change the JSON structure.
-- If you had a "price" field, you can ignore it and start using "pricing_info" in new records.

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'sub', '')
$$;

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

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

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  audience TEXT,
  type TEXT,
  payload JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Core payment flow tables ---------------------------------------------------

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

CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS jobs_homeowner_idx ON jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS jobs_provider_idx ON jobs(provider_id);
CREATE INDEX IF NOT EXISTS payments_job_idx ON payments(job_id);
CREATE INDEX IF NOT EXISTS disputes_job_idx ON disputes(job_id);
