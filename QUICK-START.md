# ZapTasks - Quick Start Guide

## 🚀 Get Your Marketplace Running in Hours

This guide will get ZapTasks deployed and running in production mode quickly.

## Prerequisites Checklist

Before starting, sign up for these services (all have free tiers):

- [ ] [Supabase](https://supabase.com) - Database & Storage
- [ ] [Stripe](https://stripe.com) - Payments (complete business profile to enable Connect)
- [ ] [Clerk](https://clerk.com) - Authentication
- [ ] [Google Cloud](https://console.cloud.google.com) - Maps API
- [ ] [Vercel](https://vercel.com) - Hosting

## Step 1: Set Up Database (15 minutes)

1. Create a new Supabase project
2. Go to **SQL Editor** in Supabase dashboard
3. Copy & paste contents of `supabase/SETUP-DATABASE.sql`
4. Click **Run** to execute
5. Verify all tables created successfully in **Table Editor**

## Step 2: Configure Storage (5 minutes)

1. In Supabase, go to **Storage**
2. Create new bucket: `job-photos`
3. Set to **Public**
4. Go to **Policies** tab
5. Add these policies:

```sql
-- Upload policy
CREATE POLICY "Authenticated users upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-photos');

-- View policy
CREATE POLICY "Anyone can view"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');
```

## Step 3: Set Up Authentication (10 minutes)

1. Create Clerk application at [clerk.com/dashboard](https://dashboard.clerk.com)
2. Choose authentication methods (Email recommended)
3. Note your **Publishable Key** and **Secret Key**
4. In Clerk settings, set:
   - Sign-in path: `/sign-in`
   - Sign-up path: `/sign-up`
   - After sign-in: `/`

## Step 4: Set Up Payments (15 minutes)

1. Go to [stripe.com/dashboard](https://dashboard.stripe.com)
2. Complete your business profile (required for Connect)
3. Go to **Connect** > **Settings** and enable Stripe Connect
4. Go to **Developers** > **API keys**
5. Copy **Publishable key** and **Secret key** (use test keys for now)

## Step 5: Set Up Google Maps (10 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project (or use existing)
3. Enable these APIs:
   - Places API
   - Geocoding API
   - Maps JavaScript API
4. Create API key under **Credentials**
5. Restrict key:
   - Add your domains (`localhost:3000`, `yourdomain.com`)
   - Select only the 3 APIs above

## Step 6: Configure Environment (5 minutes)

Create `.env.local` in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Stripe (use test keys first)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=  # Add after deployment

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
```

## Step 7: Test Locally (10 minutes)

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and test:

1. Sign up for an account
2. Post a test job at `/booking`
3. Sign up as another user (incognito window)
4. Apply to the job at `/pro/jobs`
5. Verify everything works

## Step 8: Deploy to Vercel (10 minutes)

1. Push code to GitHub
2. Import project in [Vercel dashboard](https://vercel.com/new)
3. Add all environment variables from `.env.local`
4. Click **Deploy**
5. Note your deployment URL

## Step 9: Configure Webhook (5 minutes)

1. In Stripe Dashboard, go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-vercel-url.vercel.app/api/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Copy **Signing secret** (starts with `whsec_`)
6. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
7. Redeploy

## Step 10: Add Yourself as Admin (5 minutes)

1. Sign up on your deployed site
2. Copy your user ID from Clerk Dashboard
3. In Supabase SQL Editor, run:

```sql
INSERT INTO platform_admins (user_id)
VALUES ('user_YOUR_CLERK_ID');
```

4. Now you can access `/admin` dashboard

## ✅ Production Testing Checklist

Run through this complete flow:

### As Homeowner
- [ ] Sign up
- [ ] Post job with photo
- [ ] View applications
- [ ] Accept application
- [ ] Pay with test card: `4242 4242 4242 4242`
- [ ] Mark job complete
- [ ] Submit review

### As Provider
- [ ] Sign up (different account)
- [ ] Go to `/pro/onboard`
- [ ] Complete Stripe onboarding (use test bank: `000123456789` routing: `110000000`)
- [ ] Apply to job
- [ ] Receive notification
- [ ] Verify payment received
- [ ] View review on profile

### As Admin
- [ ] Access `/admin`
- [ ] Create test dispute
- [ ] Resolve dispute

## 🎉 You're Live!

If all tests passed, you're ready for **SOFT LAUNCH**:

1. **Switch Stripe to Live Mode** (when ready for real money)
   - Get live API keys from Stripe
   - Update environment variables
   - Create new webhook for live mode
   - Redeploy

2. **Invite Beta Users**
   - Start with 10-20 users
   - Monitor closely for bugs
   - Collect feedback

3. **Monitor**
   - Vercel logs for errors
   - Stripe dashboard for payments
   - Supabase logs for database issues

## 📚 Important Links

- **Full Setup Guide**: `PRODUCTION-SETUP.md`
- **Production Readiness**: `PRODUCTION-READY.md`
- **Database Script**: `supabase/SETUP-DATABASE.sql`

## 🆘 Troubleshooting

**Can't sign up?**
- Check Clerk keys in environment variables
- Verify Clerk paths are set correctly

**Jobs not showing?**
- Check Supabase RLS policies ran successfully
- Verify Supabase URL and anon key

**Payments failing?**
- Ensure Stripe secret key is set
- Check provider completed Connect onboarding
- Verify webhook is receiving events

**Photos not uploading?**
- Check `job-photos` bucket exists
- Verify RLS policies on storage.objects
- Check file size (max 5MB)

## 💡 Pro Tips

1. **Use test mode** until you're confident everything works
2. **Monitor Stripe logs** closely during first transactions
3. **Keep environment variables** backed up securely
4. **Enable 2FA** on all accounts (Stripe, Supabase, Clerk)
5. **Regular backups** of Supabase database

## Next Steps After Launch

1. Set up email notifications (Resend/SendGrid)
2. Add search/filtering to job board
3. Implement background check integration
4. Create marketing materials
5. Build out FAQ and help docs
6. Set up analytics (Google Analytics, Mixpanel)

---

**Estimated total setup time: 90 minutes**

Good luck! 🚀
