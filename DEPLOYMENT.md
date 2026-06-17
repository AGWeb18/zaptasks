# Deployment Guide for ZapTasks (Updated)

This guide outlines the steps to get ZapTasks production-ready.

## 1. Database Setup (Supabase)

Follow `/supabase/SUPABASE-SETUP.md` for full steps:

- Create project
- Run scripts in order: `database.sql`, `provider_reviews.sql`, `chat.sql`, `rls-policies.sql`

## 2. Environment Variables (.env.local + Vercel/Netlify)

Set the following environment variables in your deployment platform (e.g., Vercel) and `.env.local` for local development.

### Core

- `NEXT_PUBLIC_BASE_URL=https://yourdomain.com`: The full URL of your site (e.g., `https://zaptasks.com`). Used for Stripe and Clerk redirects.

### Clerk (Auth)

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...`: Your Clerk Publishable Key.
- `CLERK_SECRET_KEY=sk_...`: Your Clerk Secret Key.

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL=...`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`: Your Supabase Anon Key.

### Stripe (Payments)

- `STRIPE_SECRET_KEY=sk_...`: Your Stripe Secret Key (`sk_...`).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...`: Your Stripe Publishable Key (`pk_...`).
- `STRIPE_WEBHOOK_SECRET=whsec_...`: Your Stripe Webhook Secret (for webhooks).

### Google Maps (Location)

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...`: For address autocomplete.

### Admin & Support

- `ZAPTASKS_ADMIN_IDS=user_123,user_456`: Comma-separated list of Clerk User IDs who can access the Admin Dashboard (e.g., `user_123,user_456`).
- `NEXT_PUBLIC_INTERCOM_APP_ID`: (Optional) If you use Intercom for support chat.

## 3. Deploy

- Push to GitHub
- Connect Vercel/Netlify → auto-deploys on push

## 4. Post-Deployment Tests

1.  **Helper Onboarding**: Log in as a provider, go to "Find Local Jobs" (`/pro/jobs`), and verify the "Connect Bank Account" banner appears.
2.  **Full Flow**: Post a job as a homeowner, apply as a provider, award the job, and complete the escrow payment (full amount upfront) → payout (90% to helper).
3.  **Admin**: Access `/admin` with an authorized user ID to view and resolve disputes.
4.  **Mobile**: Test Apple Pay and Stripe Elements on iOS.

✅ Simple escrow (100% upfront, 10% fee). Launch-ready!
