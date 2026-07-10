import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import Navbar from "./components/NavBar";
import SiteFooter from "./components/SiteFooter";

const helperSteps = [
  {
    title: "Create your free profile",
    body: "Sign up and connect your bank once through Stripe. No subscription, no signup fee — it costs nothing until you earn.",
  },
  {
    title: "Browse jobs near you",
    body: "See what neighbours are posting — snow, lawns, cleaning, odd jobs. Apply with your own price. No quotas, no minimum hours.",
  },
  {
    title: "Do the work, get paid",
    body: "The poster's card is pre-authorized before you start. When they confirm it's done, your payout goes straight to your bank.",
  },
];

const posterSteps = [
  {
    title: "Describe the job",
    body: "A few sentences and a photo. Takes about two minutes.",
  },
  {
    title: "Pick your helper",
    body: "Local helpers apply with their price. Check reviews and chat before you decide.",
  },
  {
    title: "Pay only when it's done",
    body: "Your card is pre-authorized when you hire and charged only after you confirm the job is complete.",
  },
];

const categories = [
  { emoji: "❄️", name: "Snow removal", desc: "Driveways, walkways, steps" },
  { emoji: "🌿", name: "Yard & outdoor", desc: "Mowing, raking, gutters" },
  { emoji: "🔧", name: "Home fixes", desc: "TV mounting, furniture, small repairs" },
  { emoji: "🧽", name: "Cleaning", desc: "Deep cleans & move-outs" },
  { emoji: "🛒", name: "Grocery runs", desc: "Errands & pickups for neighbours" },
  { emoji: "⚡", name: "Odd jobs", desc: "Moving help, hauling, anything else" },
];

const faqs = [
  {
    q: "What does it cost to join as a helper?",
    a: "Nothing. There's no signup fee, no subscription, and no charge to apply for jobs. ZapTasks takes 10% of a job only when you actually get paid, and standard card-processing fees apply to the payment.",
  },
  {
    q: "How and when do I get paid?",
    a: "The job poster's card is pre-authorized before you start work. Once they confirm the job is complete, the card is charged and your payout is sent to your bank through Stripe. Your first payout can take a few extra days while Stripe verifies your account.",
  },
  {
    q: "Do I need to be a licensed professional?",
    a: "No — most jobs are everyday tasks like shovelling, mowing, cleaning, and assembling furniture. Only take on work you're qualified to do; regulated trades like electrical and gas work should be left to licensed professionals.",
  },
  {
    q: "How do I know I'll actually get paid for a job?",
    a: "The poster's card is pre-authorized when they hire you, so the money is confirmed before you pick up a shovel. It's charged and paid out when they confirm the job is done.",
  },
  {
    q: "I'm posting a job — when am I charged?",
    a: "Your card is pre-authorized when you hire a helper, but only charged after you confirm the work is complete. If something goes wrong, our support team is a message away.",
  },
  {
    q: "Where is ZapTasks available?",
    a: "Anywhere in Canada. We're growing neighbourhood by neighbourhood, so job volume varies by area — posting a job or creating a helper profile is exactly what kick-starts yours.",
  },
];

const HomePage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-100">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-40 -left-40 h-96 w-96 rounded-full bg-blue-100/50 blur-3xl"
          />

          <div className="container relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 md:py-24 lg:grid-cols-2">
            <div>
              {/* <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <MapPin className="h-4 w-4" />
                Your neighbourhood is hiring
              </div>

              <h1 className="mb-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Get paid to help{" "}
                <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">
                  your neighbours
                </span>
              </h1>

              <p className="mb-8 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                Browse jobs posted near you — snow, lawns, cleaning, odd jobs.
                Set your own rates and work when you want. Joining is free, and
                ZapTasks takes 10% only when you get paid.
              </p> */}
              <div>
                <h1 className="mb-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Your Schedule. <br/>
                  Your Rates.{" "} <br/>
                  <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">
                    Your Local Side Hustle.
                  </span>
                </h1>

                <p className="mb-8 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
                  Find flexible gigs right in your neighborhood—from lawn care and cleaning to snow removal and odd jobs. With ZapTasks, you call the shots.
                </p>
              </div>

              <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/pro/onboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl"
                >
                  Start earning
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/booking"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Post a job free
                </Link>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Free to join
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No lead fees, no subscriptions
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Paid to your bank via Stripe
                </li>
              </ul>
            </div>

            {/* Example job + payout visual */}
            <div className="relative mx-auto w-full max-w-md pb-16 lg:pb-10">
              <div
                aria-hidden="true"
                className="absolute -top-6 left-6 right-14 rounded-2xl border border-slate-100 bg-white/70 p-5 shadow-sm -rotate-2"
              >
                <div className="h-3 w-2/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
              </div>

              <div className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <span className="text-2xl" aria-hidden="true">
                      ❄️
                    </span>
                    Snow removal
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Example job
                  </span>
                </div>
                <h2 className="mb-2 text-xl font-bold text-slate-900">
                  Shovel my driveway &amp; front walk
                </h2>
                <div className="mb-5 flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> 2 km away
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarCheck className="h-4 w-4" /> Today
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-medium text-slate-500">
                    Posted budget
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900">
                    $80
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-2 right-0 w-64 rounded-2xl bg-slate-900 p-5 text-white shadow-2xl sm:-right-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Your payout
                </p>
                <p className="mt-1 text-3xl font-extrabold text-emerald-400">
                  $72
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  $80 job − $8 ZapTasks fee
                  <span className="align-super">*</span>
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <Banknote className="h-4 w-4 text-emerald-400" />
                  Sent to your bank via Stripe
                </p>
              </div>
            </div>
          </div>

          <p className="container mx-auto max-w-6xl px-4 pb-6 text-xs text-slate-400">
            *Standard card-processing fees apply to payments.
          </p>
        </section>

        {/* Fee transparency strip */}
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="container mx-auto max-w-6xl px-4 py-12">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              {[
                { big: "$0", small: "to join" },
                { big: "$0", small: "lead fees" },
                { big: "$0", small: "monthly subscription" },
                { big: "10%", small: "only when you're paid" },
              ].map((item) => (
                <div key={item.small}>
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                    {item.big}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {item.small}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-slate-600">
              Many platforms charge for leads before you&apos;ve earned a cent.{" "}
              <span className="font-semibold text-slate-900">
                ZapTasks never does
              </span>{" "}
              — if you don&apos;t get paid, neither do we.
            </p>
          </div>
        </section>

        {/* How it works — helpers */}
        <section className="container mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="mb-14 max-w-2xl">
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Start earning in three steps
            </h2>
            <p className="text-lg text-slate-600">
              For people who want to earn on their own terms — no boss, no
              schedule but yours.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {helperSteps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-xl font-extrabold text-emerald-700">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="leading-relaxed text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/pro/onboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 font-bold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg"
            >
              Become a helper
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pro/jobs"
              className="ml-5 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
            >
              or browse open jobs first
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Categories */}
        <section className="border-y border-slate-100 bg-slate-50">
          <div className="container mx-auto max-w-6xl px-4 py-20">
            <div className="mb-12 max-w-2xl">
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                The kind of work neighbours post
              </h2>
              <p className="text-lg text-slate-600">
                Everyday jobs that don&apos;t need a truck roll from a big
                company — just someone nearby who&apos;s willing.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href="/pro/jobs"
                  className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="mb-3 text-4xl" aria-hidden="true">
                    {cat.emoji}
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-700">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-slate-600">{cat.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Posters */}
        <section className="container mx-auto max-w-6xl px-4 py-20 md:py-24">
          <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 text-white sm:px-12">
            <div className="mb-12 max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-4 py-1.5 text-sm font-semibold text-blue-300">
                <ClipboardList className="h-4 w-4" />
                For job posters
              </div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Need something done instead?
              </h2>
              <p className="text-lg text-slate-300">
                Post it free and get offers from real people nearby —
                you&apos;re only charged after you confirm the job is done.
              </p>
            </div>

            <div className="mb-12 grid gap-8 md:grid-cols-3">
              {posterSteps.map((step, i) => (
                <div key={step.title}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 font-extrabold text-blue-300">
                    {i + 1}
                  </div>
                  <h3 className="mb-2 font-bold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/booking"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-500"
            >
              <Sparkles className="h-5 w-5" />
              Post a job free — takes 2 minutes
            </Link>
          </div>
        </section>

        {/* Trust & safety */}
        <section className="border-y border-slate-100 bg-slate-50">
          <div className="container mx-auto max-w-6xl px-4 py-20">
            <div className="mb-12 max-w-2xl">
              <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Built so nobody gets burned
              </h2>
              <p className="text-lg text-slate-600">
                No fine print, no surprises — here&apos;s exactly how we keep
                both sides safe.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "Payment secured up front",
                  body: "The poster's card is pre-authorized before work starts and charged only when the job is confirmed done.",
                },
                {
                  icon: Star,
                  title: "Reviews on every job",
                  body: "Both sides rate each completed job, so good work builds a visible reputation.",
                },
                {
                  icon: MessageCircle,
                  title: "In-app chat",
                  body: "All communication stays in one place, so there's a record if anything's ever in dispute.",
                },
                {
                  icon: Wallet,
                  title: "Payouts by Stripe",
                  body: "Payments and bank payouts run on Stripe — we never see or store card numbers.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                >
                  <item.icon className="mb-4 h-7 w-7 text-emerald-600" />
                  <h3 className="mb-2 font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto max-w-3xl px-4 py-20 md:py-24">
          <h2 className="mb-10 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Questions people ask before joining
          </h2>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
            {faqs.map((faq) => (
              <details key={faq.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-slate-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Something else on your mind? Check{" "}
            <Link
              href="/faq"
              className="font-semibold text-emerald-700 hover:underline"
            >
              Help &amp; Safety
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:myzaptasks@gmail.com"
              className="font-semibold text-emerald-700 hover:underline"
            >
              myzaptasks@gmail.com
            </a>
            .
          </p>
        </section>

        {/* Final CTA */}
        <section className="border-t border-slate-100 bg-gradient-to-b from-white to-emerald-50/60">
          <div className="container mx-auto max-w-3xl px-4 py-20 text-center md:py-24">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Your neighbours are posting jobs.
              <br />
              Be the one who shows up.
            </h2>
            <p className="mb-8 text-lg text-slate-600">
              Free to join. You set the rates. Paid straight to your bank.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/pro/onboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-9 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl"
              >
                Start earning
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-900 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Post a job
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default HomePage;
