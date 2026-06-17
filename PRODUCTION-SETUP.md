# ZapTasks Production Setup Guide

This guide will help you deploy ZapTasks to production in a few hours.

## Prerequisites

- Node.js 18+ installed
- npm installed
- Supabase account
- Stripe account
- Clerk account
- Google Cloud account (for Maps API)
- Vercel account (recommended for deployment)

## Step 1: Clone and Install Dependencies

```bash
git clone <your-repo>
cd zaptasks
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2.2 Run the Database Setup Script

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase/SETUP-DATABASE.sql`
4. Paste and run the script
5. Verify all tables were created successfully

### 2.3 Set Up Storage for Job Photos

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket called `job-photos`
3. Set it to **Public** access
4. Add the following RLS policies to `storage.objects`:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload job photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-photos');

-- Allow anyone to view photos
CREATE POLICY "Anyone can view job photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'job-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own job photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-photos' AND auth.uid()::text = owner);
```

### 2.4 Add Yourself as Platform Admin

Run this query in SQL Editor (replace with your Clerk user ID):

```sql
INSERT INTO platform_admins (user_id)
VALUES ('user_YOUR_CLERK_ID_HERE');
```

You can find your Clerk user ID after signing up in Step 3.

## Step 3: Set Up Clerk Authentication

### 3.1 Create a Clerk Application

1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Choose authentication methods (Email, Google, etc.)
4. Note your **Publishable Key** and **Secret Key**

### 3.2 Configure Clerk Settings

1. In Clerk Dashboard, go to **User & Authentication** > **Email, Phone, Username**
2. Ensure email is enabled and required
3. Go to **Paths** and set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/`
   - After sign-up: `/`

## Step 4: Set Up Stripe

### 4.1 Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Create an account (or use existing)
3. **Important**: Complete your business profile to activate Stripe Connect

### 4.2 Enable Stripe Connect

1. In Stripe Dashboard, go to **Connect** > **Settings**
2. Enable **Connect** for your account
3. Set up your branding and business information
4. Note your **Publishable Key** and **Secret Key** (from Developers > API Keys)

### 4.3 Set Up Webhook Endpoint

You'll configure this after deploying (Step 7).

## Step 5: Set Up Google Maps API

### 5.1 Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)

### 5.2 Enable Required APIs

1. Go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Places API**
   - **Geocoding API**
   - **Maps JavaScript API**

### 5.3 Create API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. **Important**: Restrict the API key:
   - Under **Application restrictions**, choose **HTTP referrers**
   - Add your domains (e.g., `localhost:3000/*`, `yourdomain.com/*`)
   - Under **API restrictions**, select the 3 APIs enabled above
4. Note your API key

## Step 6: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # You'll add this after Step 7

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Environment Variable Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - From Supabase project settings
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase project API settings
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- [ ] `CLERK_SECRET_KEY` - From Clerk dashboard (keep secret!)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - From Stripe dashboard
- [ ] `STRIPE_SECRET_KEY` - From Stripe dashboard (keep secret!)
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe webhooks (add after deployment)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - From Google Cloud console

## Step 7: Deploy to Vercel

### 7.1 Deploy the Application

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add all environment variables from Step 6
5. Deploy!

### 7.2 Set Up Stripe Webhook

1. Copy your Vercel deployment URL (e.g., `https://zaptasks.vercel.app`)
2. In Stripe Dashboard, go to **Developers** > **Webhooks**
3. Click **Add endpoint**
4. Set URL to: `https://your-domain.vercel.app/api/stripe/webhook`
5. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
8. Redeploy your app

## Step 8: Test the Complete Flow

### 8.1 Test as Homeowner

1. Sign up for an account
2. Go to `/booking`
3. Create a test job posting with:
   - Title, description
   - Service date/time
   - Budget
   - Address (use autocomplete)
   - Upload a test photo
4. Submit and verify it appears on `/pro/jobs`

### 8.2 Set Up as Helper/Provider

1. Sign up with a different account (or use incognito mode)
2. Go to `/pro/onboard`
3. Complete Stripe Connect onboarding
   - **Important**: Use Stripe test mode
   - Fill in test bank details (use Stripe test data)
4. Go to `/pro/jobs`
5. Apply to the job you created
6. Verify application shows up

### 8.3 Test Payment Flow

1. Switch back to homeowner account
2. Go to `/manage-booking`
3. View applications on your job
4. Accept one application
5. Complete payment using test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
6. Verify payment succeeds
7. Mark job as complete
8. Submit a review
9. Switch to provider account and verify funds received

### 8.4 Test Admin Dashboard

1. Get your Clerk user ID from Clerk Dashboard
2. Add yourself to `platform_admins` table in Supabase
3. Create a test dispute
4. Go to `/admin`
5. Verify you can see and resolve disputes

## Step 9: Switch to Production Mode

### 9.1 Stripe Production Keys

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Get your **Live** API keys
3. Update environment variables in Vercel:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Live publishable key
   - `STRIPE_SECRET_KEY` → Live secret key
4. Create a **new webhook** for production with the same events
5. Update `STRIPE_WEBHOOK_SECRET` with the new signing secret
6. Redeploy

### 9.2 Clerk Production

1. In Clerk Dashboard, go to your application
2. If using development instance, create a production instance
3. Update environment variables with production keys
4. Redeploy

### 9.3 Final Production Checklist

- [ ] All environment variables use production keys
- [ ] Stripe is in live mode with production keys
- [ ] Stripe webhook is configured for production URL
- [ ] Google Maps API key has production domain restrictions
- [ ] Supabase is in production mode (not paused)
- [ ] You're added to `platform_admins` table
- [ ] Storage bucket `job-photos` exists and has correct RLS policies
- [ ] Test the complete flow end-to-end in production
- [ ] Terms of Service and Privacy Policy reviewed
- [ ] Contact support email configured

## Step 10: Monitoring and Maintenance

### Regular Tasks

1. **Monitor Stripe Dashboard** for payments and disputes
2. **Check Supabase Logs** for database errors
3. **Review Clerk Dashboard** for authentication issues
4. **Monitor Vercel Logs** for application errors

### Important URLs

- Homeowner job posting: `https://yourdomain.com/booking`
- Provider job board: `https://yourdomain.com/pro/jobs`
- Provider onboarding: `https://yourdomain.com/pro/onboard`
- Admin dashboard: `https://yourdomain.com/admin`
- Manage bookings: `https://yourdomain.com/manage-booking`

## Troubleshooting

### Users can't sign up

- Check Clerk configuration
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- Check Clerk dashboard for errors

### Jobs not appearing

- Verify Supabase RLS policies are set correctly
- Check browser console for errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Payments failing

- Check Stripe Dashboard > Logs for errors
- Verify `STRIPE_SECRET_KEY` is set
- Ensure provider has completed Stripe Connect onboarding
- Check webhook is receiving events

### Address autocomplete not working

- Verify Google Maps API key is set
- Check API key restrictions
- Ensure Places API and Geocoding API are enabled
- Check browser console for errors

### Photos not uploading

- Verify `job-photos` bucket exists in Supabase Storage
- Check RLS policies on `storage.objects`
- Verify file size is under 5MB

## Security Recommendations

1. **Never commit `.env.local`** to git (it's already in `.gitignore`)
2. **Rotate API keys** if they're ever exposed
3. **Use Stripe test mode** until you're ready for real payments
4. **Monitor Stripe webhooks** for suspicious activity
5. **Review platform admin list** regularly
6. **Keep dependencies updated** with `npm audit` and `npm update`
7. **Enable 2FA** on all service accounts (Stripe, Supabase, Clerk, Vercel)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Check Stripe dashboard logs
4. Review Supabase logs
5. Check browser console for JavaScript errors

## Cost Estimates (Production)

- **Vercel**: Free tier should handle initial traffic
- **Supabase**: Free tier includes 500MB database + 1GB storage
- **Clerk**: Free tier includes 10,000 monthly active users
- **Stripe**: 2.9% + 30¢ per transaction + Connect fees
- **Google Maps API**: $7 per 1,000 requests (with $200 free credit/month)

Total monthly cost for early-stage: **~$0-50** depending on usage

## Next Steps After Launch

1. Add email notifications (Resend, SendGrid, or similar)
2. Implement provider search/filtering
3. Add provider profile pages
4. Implement background checks (Checkr integration)
5. Add insurance verification
6. Build mobile app (React Native)
7. Add push notifications
8. Implement referral program
9. Add analytics (Google Analytics, Mixpanel)
10. Create helper resources and training materials

Good luck with your launch! 🚀
