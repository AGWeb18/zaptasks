import Link from "next/link";
import Navbar from "./components/NavBar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          🧭
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Page not found
        </h1>
        <p className="text-slate-500 mb-8">
          That page doesn&apos;t exist — it may have moved, or the link is out
          of date.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/pro/jobs"
            className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Browse open jobs
          </Link>
        </div>
      </main>
    </div>
  );
}
