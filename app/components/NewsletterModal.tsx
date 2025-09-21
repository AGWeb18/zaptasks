"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "zaptasks-newsletter-dismissed";

export function NewsletterModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setOpen(true);
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);

  const handleClose = () => {
    setOpen(false);
    window.localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Unlock 10% off your first Kawarthas or GTA booking
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Join our Canadian homeowner newsletter for seasonal checklists, top-rated pros, and exclusive launch offers.
        </p>
        <form
          className="space-y-3"
          action="https://app.convertkit.com/forms"
          method="post"
        >
          <input
            required
            type="email"
            name="email"
            placeholder="you@example.com"
            className="input input-bordered w-full bg-white text-slate-900"
          />
          <button type="submit" className="btn btn-primary btn-block text-white">
            Claim my welcome offer
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          We&apos;re proudly Canadian. No spam—just local tips for Kawarthas & GTA homeowners. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

export default NewsletterModal;
