import {
  clerkMiddleware,
  createRouteMatcher
} from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  // Pages. /booking and /pro/onboard are intentionally public: both handle
  // signed-out visitors themselves (Clerk modal at submit / sign-up card),
  // instead of bouncing everyone to /sign-in first.
  '/manage-booking(.*)',
  '/admin(.*)',
  // API routes that mutate data or contain PII. /api/job-requests is not
  // listed: its GET serves the public job board (scope=open, masked
  // addresses) and every other method/scope enforces auth in the handler.
  '/api/create-customer',
  '/api/check-customer',
  '/api/job-applications(.*)',
  '/api/jobs(.*)',
  '/api/payments(.*)',
  '/api/disputes(.*)',
  '/api/notifications(.*)',
  '/api/stripe-connect-onboard(.*)',
  '/api/connect(.*)',
  '/api/get-payment-intent(.*)',
  '/api/admin(.*)',
  '/api/get-invoice(.*)',
  '/api/get-unpaid-remainder-invoices(.*)',
  '/api/setup-remaining-payment(.*)',
  '/api/places-autocomplete(.*)',
  '/api/reverse-geocode(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};