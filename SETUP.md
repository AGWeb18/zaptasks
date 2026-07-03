# ZapTasks Setup & Deployment

Consolidated from several overlapping planning docs (DEPLOYMENT.md, PRODUCTION-READY.md,
PRODUCTION-SETUP.md, QUICK-START.md, UX-AUDIT.md, UX-IMPROVEMENTS.md, IMPLEMENT-NEW-UX.md,
supabase/SUPABASE-SETUP.md) that had drifted out of date and duplicated each other. See
`CLAUDE.md` for the project overview and day-to-day dev commands.

## Accounts needed

- [Supabase](https://supabase.com) — database & storage
- [Stripe](https://stripe.com) — payments (complete the business profile to enable Connect)
- [Clerk](https://clerk.com) — authentication
- [Google Cloud](https://console.cloud.google.com) — Maps API (address autocomplete)
- [Vercel](https://vercel.com) — hosting (or any Next.js-compatible host)

## Database

Run `supabase/SETUP-DATABASE.sql` in the Supabase SQL editor — it creates every table
(`providers`, `job_requests`, `job_applications`, `notifications`, `jobs`, `job_milestones`,
`payments`, `disputes`, `payment_logs`, `provider_reviews`, `conversations`, `messages`),
plus RLS policies and triggers, in one pass.

## Environment variables

Set these in `.env.local` for local dev, and in your hosting provider's dashboard for
deployed environments:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | Full site URL, used for Stripe/Clerk redirects |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe payments |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Address autocomplete |
| `ZAPTASKS_ADMIN_IDS` | Comma-separated Clerk user IDs with `/admin` access |
| `NEXT_PUBLIC_INTERCOM_APP_ID` | Optional support chat |

## Deploy

Push to GitHub and connect the repo in Vercel (or similar) for auto-deploy on push.

## Smoke test after deploying

1. Sign in as a provider, visit `/pro/jobs`, confirm the "Connect Bank Account" banner
   appears until Stripe Connect onboarding is complete.
2. Post a job as a homeowner, apply as a provider, accept the application, and run the
   escrow payment through to payout.
3. Visit `/admin` with an authorized user ID to confirm dispute tooling loads.
4. Test Apple Pay / Stripe Elements on iOS Safari.
