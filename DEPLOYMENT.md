# Deployment Guide for ZapTasks

This guide outlines the steps to get ZapTasks production-ready.

## 1. Database Setup (Supabase)

Run the following SQL scripts in your Supabase SQL Editor in this order:

1.  `database.sql` (Core tables)
2.  `provider_reviews.sql` (Review system tables)
3.  `chat.sql` (Chat system tables)

## 2. Environment Variables

Set the following environment variables in your deployment platform (e.g., Vercel) and `.env.local` for local development.

### Core
- `NEXT_PUBLIC_BASE_URL`: The full URL of your site (e.g., `https://zaptasks.com`). Used for Stripe redirects.

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

### Stripe (Payments)
- `STRIPE_SECRET_KEY`: Your Stripe Secret Key (`sk_...`).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe Publishable Key (`pk_...`).

### Google Maps (Location)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: For address autocomplete.

### Admin & Support
- `ZAPTASKS_ADMIN_IDS`: Comma-separated list of Clerk User IDs who can access the Admin Dashboard (e.g., `user_123,user_456`).
- `NEXT_PUBLIC_INTERCOM_APP_ID`: (Optional) If you use Intercom for support chat.

## 3. Post-Deployment Checks

1.  **Provider Onboarding**: Log in as a provider, go to "Find Local Jobs" (`/pro/jobs`), and verify the "Connect Bank Account" banner appears.
2.  **Job Flow**: Post a job as a homeowner, apply as a provider, chat via the "Chat" button, and award the job.
3.  **Payments**: Verify that payments are processed using Stripe Elements (Secure Payment).
4.  **Admin**: Access `/admin` with an authorized user ID to view and resolve disputes.
