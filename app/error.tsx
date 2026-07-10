"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-1.5 mb-10">
        <Zap className="w-5 h-5 text-emerald-500" fill="currentColor" />
        <span className="text-xl font-black text-slate-900 tracking-tight">
          Zap<span className="text-blue-600">Tasks</span>
        </span>
      </Link>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-8 py-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-slate-500 mb-8">
          Sorry about that — an unexpected error stopped this page from
          loading. Trying again usually fixes it.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Go home
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-6">
          Still stuck? Email{" "}
          <a
            href="mailto:myzaptasks@gmail.com"
            className="font-semibold text-blue-600 hover:underline"
          >
            myzaptasks@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
