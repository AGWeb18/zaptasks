Implement Tiered Escrow Payment Flow

Objective: Implement a secure, user-friendly payment flow for ZapTasks.com, a home service marketplace, to handle payments for jobs (e.g., a $50 lawn mowing job) with a tiered escrow model based on job size. The system should ensure trust for homeowners and service providers, simplicity in execution, and scalability for small odd jobs and larger licensed trades, while collecting a 10% platform fee.
Recommended Payment Flow:
• For small jobs (<$100, e.g., $50 lawn mowing): Homeowner pays 100% into escrow upfront. Upon job completion, ZapTasks deducts a 10% fee ($5) and releases the remainder ($45) to the service provider.
• For medium jobs ($100–$500): Homeowner pays 50% into escrow upfront, 50% upon completion. ZapTasks deducts 10% from the total.
• For large jobs (>$500): Homeowner pays 30% upfront, progress payments (e.g., 30% mid-job), and remainder upon completion. ZapTasks deducts 10% (or consider 8% for competitiveness).
• Implement dispute resolution and refund mechanisms to handle cancellations or issues.
Technical Requirements:

1. Payment Processor Integration
   • Use Stripe Connect for escrow, payouts, and fee collection:
   • Set up a Stripe Connect Standard Account for service providers to onboard and receive payouts.
   • Use Stripe Payment Intents with a holding mechanism (e.g., capture_method=manual) to hold funds in escrow until job completion.
   • Configure a destination charge model to collect the 10% platform fee and transfer the remainder to the service provider’s Stripe account.
   • Ensure compliance with Stripe’s escrow-like holding requirements (funds held ≤ 90 days).
   • Transaction Fees:
   • Account for Stripe’s fees (~2.9% + $0.30 per transaction, ~$1.75 for a $50 job).
   • Ensure the 10% platform fee ($5) covers Stripe fees and leaves profit (~$3.25).
   • Alternative: If Stripe Connect is too complex initially, use PayPal’s Adaptive Payments or Braintree Marketplace for similar escrow and split-payment functionality.
2. Database Schema
   • Create tables to manage payments, jobs, and disputes: \***\* PLEASE REVIEW OUR database.sql file AND ENSURE WE DON"T HAVE DUPLICATE TABLES \*\***
   • Jobs Table:
   • job_id (primary key)
   • homeowner_id (foreign key to users)
   • provider_id (foreign key to users)
   • total_amount (e.g., 5000 cents for $50)
   • job_status (e.g., pending, in_progress, completed, disputed, canceled)
   • escrow_amount (e.g., 5000 cents for small jobs)
   • platform_fee (e.g., 500 cents for 10%)
   • completion_date (timestamp)
   • Payments Table:
   • payment_id (primary key)
   • job_id (foreign key)
   • stripe_payment_intent_id (links to Stripe)
   • amount (in cents)
   • status (e.g., held, released, refunded)
   • payment_type (e.g., escrow, completion, progress)
   • created_at (timestamp)
   • Disputes Table:
   • dispute_id (primary key)
   • job_id (foreign key)
   • status (e.g., open, resolved, escalated)
   • evidence (JSON or file references, e.g., photos)
   • resolution (e.g., full_refunded, partial_refunded, released)
3. Payment Flow Implementation
   • Step 1: Job Booking:
   • When a homeowner books a job, calculate the escrow amount based on job size:
   • <$100: 100% of total (e.g., $50 → 5000 cents).
   • $100–$500: 50% of total.
   • >$500: 30% of total (adjust for progress payments).
   • Create a Stripe Payment Intent with amount=escrow_amount, capture_method=manual, and destination=provider_stripe_account_id.
   • Store the Payment Intent ID in the Payments table with status=held.
   • Notify the homeowner (email/push): “$50 held in escrow for lawn mowing job.”
   • Step 2: Job Progress (for Large Jobs):
   • For jobs >$500, allow progress payments (e.g., 30% mid-job).
   • Create additional Payment Intents for progress payments, triggered by homeowner approval or milestone verification (e.g., API endpoint to mark milestone).
   • Update Jobs table with milestone status.
   • Step 3: Job Completion:
   • Homeowner confirms completion via app/website (e.g., button to “Mark as Complete” with optional rating).
   • For small jobs, capture the full Payment Intent (stripe.paymentIntents.capture).
   • For medium/large jobs, create a new Payment Intent for the remaining balance (e.g., $25 for a $50 job with 50% escrow).
   • Deduct 10% platform fee (application_fee_amount=500 cents for $50 job) and transfer the remainder to the provider’s Stripe account.
   • Update Payments table to status=released and Jobs table to status=completed.
   • Notify both parties: “$45 paid to provider, $5 to ZapTasks.”
   • Step 4: Cancellations:
   • If canceled before work starts, refund the full escrow amount (stripe.refunds.create).
   • Update Payments table to status=refunded and Jobs table to status=canceled.
   • Notify both parties: “$50 refunded to homeowner.”
   • Step 5: Disputes:
   • Allow homeowners to open a dispute within 24 hours of completion via a form (e.g., upload photos, describe issue).
   • Store dispute details in Disputes table with status=open.
   • Hold escrow funds until resolution (manual review or automated rules, e.g., refund if provider doesn’t respond within 48 hours).
   • Notify both parties of dispute status and resolution.
4. User Interface
   • Homeowner View:
   • Booking: Display “Total: $50, $50 held in escrow” with a clear explanation (e.g., “Funds held securely until job completion”).
   • Payment Form: Integrate Stripe Elements for card input, ensuring PCI compliance.
   • Completion: Show a “Mark as Complete” button with a 5-star rating and optional feedback.
   • Dispute: Provide a “Report Issue” button linking to a form for evidence upload.
   • Provider View:
   • Show job details with “Escrow: $50, You’ll receive: $45 after completion.”
   • Notify when funds are released: “$45 paid for lawn mowing job.”
   • General:
   • Use real-time notifications (email, push, or in-app) for payment events (escrow, release, refund).
   • Display a fee breakdown: “$50 total: $45 to provider, $5 to ZapTasks.”
5. API Endpoints
   Implement the following REST API endpoints (or equivalent in your framework, e.g., Node.js, Django, Laravel):
   • POST /jobs: Create a job with total_amount, escrow_percentage (100%, 50%, or 30% based on job size).
   • POST /payments/escrow: Create a Payment Intent for escrow, store in Payments table.
   • POST /jobs/:id/complete: Mark job as complete, capture escrow, create completion payment if needed.
   • POST /jobs/:id/cancel: Refund escrow, update job status.
   • POST /jobs/:id/dispute: Create a dispute, store evidence, hold funds.
   • PATCH /disputes/:id/resolve: Resolve dispute (release funds, partial/full refund).
6. Dispute Resolution
   • Build a simple admin dashboard to review disputes:
   • Display job details, homeowner/provider evidence, and chat history.
   • Allow manual resolution (e.g., “Release $45 to provider” or “Refund $50 to homeowner”).
   • Automate basic rules (optional):
   • If homeowner doesn’t confirm completion within 48 hours, auto-release funds to provider.
   • If provider doesn’t respond to dispute within 48 hours, auto-refunded to homeowner.
   • Store resolution details in Disputes table for audit purposes.
7. Scalability for Licensed Trades
   • Support progress payments for jobs >$500:
   • Add a milestones field in Jobs table (JSON or separate table) to track progress (e.g., “30% for materials, 30% for mid-job”).
   • Create API endpoints for milestone approvals (POST /jobs/:id/milestone).
   • Allow document uploads (e.g., licenses, insurance) for providers via a secure file storage service (e.g., AWS S3, Firebase Storage).
   • Consider tiered fees (e.g., 8% for jobs >$500) to stay competitive with platforms like Angi. Update platform_fee calculation accordingly.
8. Security and Compliance
   • PCI Compliance: Use Stripe Elements or equivalent to avoid storing card details.
   • Data Privacy: Encrypt sensitive fields (e.g., stripe_payment_intent_id) in the database.
   • Fraud Prevention: Validate provider identities during onboarding (e.g., Stripe Connect’s ID verification).
   • Audit Trail: Log all payment actions (escrow, release, refund) in a PaymentLogs table for transparency.
9. Testing and Monitoring
   • Unit Tests:
   • Test Payment Intent creation, capture, and refund scenarios.
   • Validate escrow calculations (100%, 50%, 30%) based on job size.
   • Test dispute resolution logic (e.g., auto-release after 48 hours).
   • Integration Tests:
   • Simulate Stripe webhooks (payment_intent.succeeded, payment_intent.payment_failed) to ensure proper handling.
   • Test end-to-end flow: booking → escrow → completion → payout.
   • Monitoring:
   • Set up alerts for failed payments or disputes using Stripe’s webhook logs.
   • Track platform fee revenue and transaction costs in a dashboard (e.g., using Mixpanel or a custom analytics table).
10. User Feedback and Iteration
    • After launch, collect feedback via in-app surveys:
    • Homeowners: “Was paying $50 upfront clear and trustworthy?”
    • Providers: “Is the $45 payout process fast and fair?”
    • Monitor metrics: job completion rate, dispute rate, cancellation rate.
    • If homeowners resist 100% escrow for small jobs, test 50% escrow or no escrow with strong provider vetting.
    Example Flow for $50 Lawn Mowing Job
11. Homeowner books job, pays $50 into escrow via Stripe Elements.
12. Payment Intent created (amount=5000, capture_method=manual, application_fee=500).
13. Payments table updated: status=held, stripe_payment_intent_id=pi_123.
14. Provider completes job; homeowner clicks “Mark as Complete.”
15. API captures Payment Intent, transfers $45 to provider, keeps $5 for ZapTasks.
16. If disputed, homeowner uploads evidence; admin resolves within 48 hours.
17. Notifications sent: “$45 paid to provider” or “$50 refunded to homeowner.”
