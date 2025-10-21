export interface JobPaymentRecord {
  id: string;
  payment_type: string | null;
  status: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents?: number | null;
  platform_fee_cents?: number | null;
  captured_at?: string | null;
  provider_transfer_id?: string | null;
}

export interface JobMilestoneRecord {
  id: string;
  label?: string | null;
  percentage?: number | null;
  amount_cents: number | null;
  status: string | null;
  due_at?: string | null;
}
