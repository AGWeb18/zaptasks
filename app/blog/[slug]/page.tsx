import Navbar from "../../components/NavBar";
import SiteFooter from "../../components/SiteFooter";
import Link from "next/link";

export default async function BlogPostFallback({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const formatted = slug.replace(/-/g, " ");
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-white text-slate-800 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-16 flex-1 max-w-3xl">
        <Link href="/blog" className="btn btn-link px-0 mb-6 text-blue-700">
          ← Back to articles
        </Link>
        <h1 className="text-3xl font-bold capitalize">{formatted}</h1>
        <p className="mt-4 text-slate-600">
          We&apos;re putting the finishing touches on this article. Check back shortly or subscribe to the newsletter for new post alerts.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
