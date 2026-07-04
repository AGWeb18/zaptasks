# ZapTasks — Trust & Safety Implementation Plan

> **Purpose of this document:** This is a handoff spec produced from a full trust & safety audit of the ZapTasks codebase (July 2026). It is written for an AI coding agent (or developer) with no prior context. It describes the existing architecture, the problems found, and exactly what to build, in priority order. Read the "System context" section fully before touching any code.

---

## 1. System context (read first)

ZapTasks is a two-sided marketplace: **homeowners** post jobs (`job_requests`), **providers/helpers** apply (`job_applications`), the homeowner awards one application which creates a **`jobs`** row with a Stripe escrow payment plan. Terminology note: "provider" and "helper" mean the same thing; "homeowner" and "poster" mean the same thing.

### Stack

- **Next.js App Router** (frontend + API routes under `app/api/...`), TypeScript, Tailwind CSS.
- **Auth:** Clerk. Server-side user identity comes from `getAuth(req)` (`@clerk/nextjs/server`). Clerk user IDs are TEXT strings shaped like `user_2abc...` — all `*_id` user columns in the DB are TEXT, not UUID.
- **Database:** Supabase Postgres with Row Level Security (RLS). Three client factories exist in `app/utils/supabase/server.ts`:
  - `createClientWithUser(userId)` — RLS-scoped client acting as that user (RLS policies call `public.current_user_id()` which reads the JWT `sub`).
  - `createServiceRoleClient()` — bypasses RLS. Used deliberately in a few routes; every such use has a comment justifying it. Follow that convention.
- **Payments:** Stripe Connect (destination-style, per-provider connected accounts). Helpers onboard at `/pro/onboard`. Escrow helpers live in `app/lib/payments/stripeConnect.ts`.

### Relevant tables (defined across `supabase/database.sql`, `supabase/provider_reviews.sql`, `supabase/chat.sql`, policies in `supabase/rls-policies.sql`)

| Table | Purpose | Key columns |
|---|---|---|
| `job_requests` | A posted job | `homeowner_id`, `homeowner_name`, `homeowner_email`, `status` (`open`/`awarded`/`completed`/...), `address`, `created_at` |
| `job_applications` | A provider's application | `provider_id`, `provider_name`, `provider_email` (⚠️ both client-supplied), `message`, `proposed_rate`, `status` |
| `jobs` | Awarded job + escrow plan | `homeowner_id`, `provider_id`, `job_status` (`awaiting_provider_onboarding`/`awaiting_escrow`/`in_progress`/`completed`/`canceled`/`disputed`...), `total_amount_cents`, `milestone_plan` |
| `payments` | Stripe payment intents per job | `payment_type` (`escrow`/`progress`/`completion`), `status`, `captured_at`, `refunded_at` |
| `provider_reviews` | Homeowner→provider review | `job_id`, `homeowner_id`, `provider_id`, `rating` 1–5, `review_type` (`positive`/`issue`/`no_show`), `comment`; UNIQUE(job_id, homeowner_id) |
| `disputes` | Dispute per job | homeowner-managed only (RLS) |
| `providers` | Provider profile | `user_id` (PK, Clerk ID), `stripe_account_id`, `services` JSONB, `location`, `created_at` — **no name/photo/bio columns exist yet** |
| `conversations` / `messages` | 1:1 chat, not tied to jobs | no moderation fields |
| `platform_admins` | Admin allowlist | RLS policies for admins exist on several tables, but there is no admin UI beyond a dispute list |

### Key existing routes and components

- `POST /api/jobs/[id]/review` (`app/api/jobs/[id]/review/route.ts`) — creates a provider review. Validates: caller is the job's homeowner, job status ∈ {`completed`, `reserve_hold`, `canceled`, `disputed`}, no duplicate.
- `GET /api/providers/[providerId]/reputation` (`app/api/providers/[providerId]/reputation/route.ts`) — **public, unauthenticated** aggregate: verified flag (live Stripe `accounts.retrieve` per request — no caching), completed-jobs count, average rating (⚠️ computed over only the 50 most recent reviews), review list. Uses the service-role client on purpose (prospective homeowners can't read the underlying RLS-locked rows).
- `app/components/ProviderTrustStrip.tsx` — small badge row (rating, jobs done, ID verified, "New helper") that fetches the reputation endpoint. Rendered per applicant card and for the awarded helper in `app/manage-booking/page.tsx` (~lines 1421 and 1643).
- `app/providers/[providerId]/page.tsx` — public helper profile page (stats + review list).
- `app/pro/jobs/page.tsx` — provider-side job board and active-jobs view (~1,470 lines).
- `app/manage-booking/page.tsx` — homeowner-side dashboard (~1,970 lines): applicant review, award, escrow payment, review modal.
- `GET /api/job-requests?scope=open` — the public job board feed. Deliberately masks homeowner email and street address (keeps city/province only).

### Non-negotiable project principles

1. **Never fabricate trust signals.** No fake testimonials, invented counts, or placeholder ratings. Every number shown must be computed from real rows. (Existing code comments state this; the owner is explicit about it.)
2. **Fail toward less trust, not more.** If a verification check errors, show *unverified* — never default a badge to true.
3. **Don't leak homeowner PII to non-awarded providers.** Email and exact street address are only for the awarded provider. Preserve the masking behavior in `/api/job-requests?scope=open`.
4. When using `createServiceRoleClient()`, add a comment explaining why RLS must be bypassed, matching the existing convention.
5. There are no automated tests in this repo. Verify changes by running `npm run dev` and exercising flows, plus `npm run lint` and `npm run build`.

---

## 2. Work items, in priority order

Implement in this order. Each item is independently shippable.

---

### Item 1 — Poster trust signals ("is this homeowner going to pay me / are they a scammer?")

**Problem.** Trust is entirely one-directional. A provider deciding whether to apply sees only a self-reported poster name, title, budget, and masked address. There is no homeowner reputation of any kind: no paid-jobs history, no member-since, no signal that this poster has ever completed a payment. This is the single biggest gap.

**Build:**

1. **New endpoint** `GET /api/homeowners/[homeownerId]/reputation` modeled directly on the existing provider reputation route (same file structure, same service-role justification comment). Return only safe aggregates — never name, email, or address:
   - `jobsPosted` — count of `job_requests` where `homeowner_id = homeownerId`.
   - `jobsCompleted` — count of `jobs` where `homeowner_id = homeownerId` and `job_status = 'completed'`.
   - `jobsPaid` — count of distinct jobs for that homeowner having at least one `payments` row with `status = 'succeeded'` (or `captured_at IS NOT NULL`). This is the strongest anti-scam signal: real money actually moved.
   - `memberSince` — earliest `job_requests.created_at` for that homeowner (there is no homeowners table; this is the best available proxy — say so in a code comment).
   - `disputeCount` — optional; count of disputes on their jobs. If included, only surface it as a boolean-ish "has disputes" internally for now, don't display a raw count publicly.
2. **New component** `app/components/HomeownerTrustStrip.tsx`, closely mirroring `ProviderTrustStrip.tsx` (including its module-level fetch cache pattern). Badges:
   - `N jobs paid through ZapTasks` (emerald, only when `jobsPaid > 0`) — the headline signal.
   - `Member since <Mon YYYY>`.
   - When `jobsPosted === 0` elsewhere / first job: a neutral `New poster` badge (mirror the honest "New helper" treatment — do NOT hide the fact that they're new).
3. **Render it** in `app/pro/jobs/page.tsx`:
   - In the job detail modal (where the provider decides to apply — the modal around `detailJob`, near the "posted X ago · N applied" line at ~line 1332).
   - Optionally compact on each job card in the board list.
   - The job feed items already include `homeowner_id` (see the select list in `app/api/job-requests/route.ts` scope=open), so the component can fetch per poster.

**Acceptance:** A signed-in provider opening any open job sees the poster's paid-jobs count and member-since; a brand-new poster shows "New poster"; homeowner email/address remain hidden; endpoint returns no PII.

---

### Item 2 — Close the review-farming hole + fix the rating average

**Problem.** Two colluding accounts can farm 5-star reviews for free: account A posts a job → B applies → A awards (creates a `jobs` row, no payment yet) → A cancels immediately (`/api/jobs/[id]/cancel` sets `job_status='canceled'`, voiding any uncaptured intents) → A leaves a 5-star review, because the review route's allowed statuses include `canceled` and nothing checks that money ever moved. Repeat with throwaway accounts to build a fake-trustworthy profile at zero cost.

**Build (in `app/api/jobs/[id]/review/route.ts`):**

1. In the job fetch, also select the job's payments: `payments(id, status, captured_at, payment_type)`.
2. Compute `hasCapturedPayment` = any payment with `status === 'succeeded'` or a non-null `captured_at`.
3. New rule:
   - If `hasCapturedPayment` → allow full reviews as today (any rating, any `review_type`).
   - If NOT → only accept the review when `reviewType` is `'no_show'` or `'issue'`, and force/cap the stored rating at ≤ 2 (or store rating as NULL for these — pick one and keep the reputation endpoint consistent). Reject positive reviews on never-paid jobs with a 409 and a clear message like: `"Reviews with ratings require a completed payment. You can still report a no-show or an issue."`
   - Rationale to preserve: canceled-job reviews exist so homeowners can flag flaky/no-show helpers — keep that path open; only the *positive* path is closed.
4. Add a boolean to the stored/returned data so the UI can label it. Either add a `verified_payment BOOLEAN DEFAULT FALSE` column to `provider_reviews` (write a migration in `supabase/`), or derive it at read time in the reputation endpoint by joining payments. The column is simpler — prefer it.
5. **Update the reputation endpoint** (`app/api/providers/[providerId]/reputation/route.ts`):
   - Fix the average: it currently averages only the 50 most recent reviews (the display list) while implying it's the overall average. Compute `averageRating` and `reviewCount` with a proper aggregate over ALL of the provider's reviews (e.g., a second query selecting `rating` only, or an RPC/`avg` — the review list stays limited to 50 for display).
   - Include `verifiedPayment` per review in the response.
6. **UI:** in `app/providers/[providerId]/page.tsx` review cards, show a small `Verified payment` badge when true. In the homeowner review modal (`app/manage-booking/page.tsx`, `submitReview` ~line 902), surface the 409 message properly (it already displays `payload?.error`).

**Acceptance:** A canceled, never-paid job cannot receive a 4–5 star review via the API (test with curl); paid jobs review as before; profile average reflects all reviews; verified-payment badges render.

---

### Item 3 — Real identities: server-derived names + human profiles

**Problem A — spoofable names.** `provider_name`/`provider_email` on applications and `homeowner_name`/`homeowner_email` on job posts are taken from the client request body (`app/api/job-applications/route.ts` POST, `app/api/job-requests/route.ts` POST). Any user can apply as "Mike's Licensed Plumbing Ltd." with no tie to their real identity.

**Problem B — anonymous profiles.** The public helper profile (`app/providers/[providerId]/page.tsx`) shows no name, photo, or bio — the header is the literal text "Helper Profile" and the avatar renders `user_id.charAt(0)`, which is `"U"` for every user because Clerk IDs all start with `user_`. People hire people; this undermines every other trust signal.

**Build:**

1. In both POST routes, stop trusting body-supplied name/email. Fetch the canonical values server-side:
   ```ts
   import { clerkClient } from "@clerk/nextjs/server";
   const client = await clerkClient();
   const clerkUser = await client.users.getUser(userId);
   const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "ZapTasks user";
   const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
   ```
   Keep accepting the body fields for backward compatibility but ignore them (or use only as fallback when Clerk returns nothing). Do the same for `providerEmail` used in `app/pro/jobs/page.tsx` application submission — server wins.
2. Add profile columns to `providers` (migration): `display_name TEXT`, `photo_url TEXT`, `bio TEXT` (cap bio at ~500 chars server-side). Populate `display_name`/`photo_url` from Clerk (`clerkUser.imageUrl`) whenever the provider record is created/updated (see `app/api/stripe-connect-onboard/route.ts` for where the provider row is upserted).
3. Expose `displayName`, `photoUrl`, `bio` in the provider reputation endpoint response, and render them on the profile page header (photo with sensible fallback initials from the display name, not the user ID) and optionally the trust strip.
4. **Badge copy fix:** the current "ID verified via Stripe" badge actually means Stripe *payout KYC* completed (`charges_enabled && payouts_enabled && no requirements due`) — a decent proxy, not a document ID check. Change the copy in `ProviderTrustStrip.tsx` and the profile page to **"Payout identity verified"** (tooltip/subtext: "Identity confirmed through Stripe payout verification"). Do not claim document verification until Stripe Identity is integrated (out of scope here).

**Acceptance:** Applying with a spoofed `providerName` in the request body results in the Clerk-derived name being stored; profile page shows a real name and photo; no more universal "U" avatars; badge copy no longer overclaims.

---

### Item 4 — Reporting, chat safety, and enforcement hooks

**Problem.** There is no "report" button anywhere (jobs, reviews, profiles, chat). Chat has no block/report, no off-platform-payment warning, and any authenticated user can open a conversation with anyone. There is no user-level suspended/banned state, so enforcement is impossible even manually.

**Build:**

1. **`reports` table** (migration + RLS):
   ```sql
   CREATE TABLE IF NOT EXISTS reports (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     reporter_id TEXT NOT NULL,
     target_type TEXT NOT NULL CHECK (target_type IN ('job_request','review','message','user')),
     target_id TEXT NOT NULL,
     reason TEXT NOT NULL,
     details TEXT,
     status TEXT NOT NULL DEFAULT 'open',   -- open | reviewed | actioned | dismissed
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
   );
   ```
   RLS: reporters can INSERT their own (`reporter_id = current_user_id()`) and SELECT their own; admins (`platform_admins` pattern — copy an existing admin policy from `supabase/rls-policies.sql`) manage all.
2. **`POST /api/reports`** — authed; validates `target_type`/`reason` against allowlists; rate-limit naively (reject if the same user filed > ~10 reports in 24h, checked via a count query).
3. **Report buttons** (small flag icon → modal with reason select + optional details):
   - Job detail modal in `app/pro/jobs/page.tsx` ("Report this job").
   - Review cards on `app/providers/[providerId]/page.tsx` ("Report review").
   - Chat UI (`app/components/ChatModal.tsx` / `ChatWidget.tsx`) ("Report conversation").
4. **Chat safety banner:** a persistent, dismissible-per-session notice at the top of the chat modal: *"For your protection, keep payments on ZapTasks. Payments made outside the platform (e-transfer, cash) aren't covered by escrow or dispute support."* Static text — no message scanning in this pass.
5. **Suspension groundwork:** add `account_status TEXT NOT NULL DEFAULT 'active'` (`active` | `suspended`) to `providers`, and create a minimal `user_flags` table keyed by Clerk `user_id` for homeowners (`user_id TEXT PRIMARY KEY, account_status TEXT NOT NULL DEFAULT 'active', notes TEXT, updated_at ...`). Enforce in exactly three server routes (return 403 with a support-contact message): `POST /api/job-requests` (posting), `POST /api/job-applications` (applying), `POST /api/jobs` (awarding). No admin UI needed yet — flipping the column manually in Supabase is acceptable for now; note this in a comment.

**Acceptance:** Reports can be filed from all three surfaces and land in the table; a suspended provider gets a 403 when applying; chat shows the banner.

---

### Item 5 — Reputation endpoint hardening (perf/abuse)

**Problem.** `GET /api/providers/[providerId]/reputation` is public, uncached, and makes a **live Stripe `accounts.retrieve` call on every request**. A homeowner viewing 8 applicants triggers 8 Stripe API calls; a scraper could hammer both the DB and Stripe rate limits. (The award flow in `app/api/jobs/route.ts` ~line 165 does the same check — that one is fine because it's a critical single check at award time.)

**Build:**

1. Migration: add `verified BOOLEAN NOT NULL DEFAULT FALSE`, `verified_checked_at TIMESTAMP WITH TIME ZONE` to `providers`.
2. In the reputation route: read `providers.verified`; only call Stripe when `verified_checked_at` is NULL or older than 24h, then write the result back (best-effort — a write failure must not fail the request). Keep the fail-toward-unverified behavior on Stripe errors.
3. Update it from the Stripe webhook: `app/api/stripe/webhook/route.ts` — on `account.updated`, recompute the same predicate (`charges_enabled && payouts_enabled && currently_due.length === 0`) and update the provider row (match `stripe_account_id`). If `account.updated` isn't in the webhook's subscribed events, add handling defensively anyway (unknown event types must still be acked 200).
4. Add `export const revalidate = 300` or a `Cache-Control: public, max-age=300` response header on the reputation route so repeated views are cheap.

**Acceptance:** Loading a page with many trust strips triggers at most one Stripe call per stale provider; verified state still flips off within 24h (or instantly via webhook) if a provider's Stripe account becomes restricted.

---

### Item 6 — Provider replies to reviews

**Problem.** A single unfair "no show" review is disproportionately damaging with no rebuttal path.

**Build:** add `provider_response TEXT`, `provider_response_at TIMESTAMPTZ` to `provider_reviews` (migration). New route `POST /api/reviews/[reviewId]/respond`: caller must be the review's `provider_id`, one response only (reject if already set), max 1,000 chars. RLS: add a provider UPDATE policy scoped to only these columns being settable (enforce column discipline in the route since RLS can't do per-column checks cleanly — route validates payload contains only the response text). Display the response indented under the review on the profile page ("Response from the helper").

---

## 3. Explicitly out of scope (do not build now)

- **Stripe Identity document verification** — planned later; until then, never label the KYC badge as document ID verification (see Item 3.4).
- **Bidirectional star ratings (provider rates homeowner)** — Item 1's objective stats strip comes first; ratings can layer on later.
- **Automated chat content scanning / ML moderation** — banner + reports only in this pass.
- **Admin moderation dashboard UI** — enforcement columns land in Item 4; the UI is a later phase.
- **Monetization changes** — the 10% platform fee (deducted from the helper side) is settled; don't touch fee logic.

## 4. Housekeeping fix to include with any migration work

`supabase/rls-policies.sql` and `supabase/SETUP-DATABASE.sql` still contain `CREATE POLICY "anyone_can_view_open_job_requests"` on `job_requests`. That policy **was already dropped in the live database** (verified July 2026 — live policies are only `homeowners_manage_own_job_requests` and `selected_provider_can_view_job_requests`) because it exposed homeowner email and exact address to any client. Remove the CREATE from both files (keep a `DROP POLICY IF EXISTS`) so a future re-run of setup SQL doesn't reopen the PII leak. Providers get the job board exclusively through `GET /api/job-requests?scope=open`, which masks PII — keep it that way.

## 5. Verification checklist for the implementer

For each item: `npm run lint` and `npm run build` pass; then exercise the real flow in `npm run dev` with two test accounts (one homeowner, one provider):

1. Post job → apply → check poster trust strip renders for the provider (Item 1).
2. Award → cancel without paying → attempt a 5-star review via UI and via curl → expect rejection; file a `no_show` review → expect success (Item 2).
3. Apply with a tampered `providerName` in the payload → stored name matches the Clerk account (Item 3).
4. File a report from each surface; suspend the provider row manually; provider gets 403 on apply (Item 4).
5. Load an applicant list twice; confirm (via logs) Stripe is not called on the second load (Item 5).
6. Respond to a review as the provider; second response attempt rejected (Item 6).
