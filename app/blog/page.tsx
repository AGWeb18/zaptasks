import Link from "next/link";
import Navbar from "../components/NavBar";
import SiteFooter from "../components/SiteFooter";

const posts = [
  {
    slug: "winter-home-checklist",
    title: "Top 5 Kawarthas tasks to knock out before the first snowfall",
    excerpt:
      "Protect your cottage or year-round home with these essential maintenance jobs, and see which ZapTasks providers can help.",
    readTime: "4 min read",
    focus: "Homeowner tips",
    published: "October 15, 2024",
  },
  {
    slug: "gta-cleaning-providers",
    title: "How GTA homeowners are booking deep cleans in under 30 seconds",
    excerpt:
      "A behind-the-scenes look at our streamlined booking flow, including templates you can reuse for busy season turnovers.",
    readTime: "3 min read",
    focus: "Product updates",
    published: "September 28, 2024",
  },
  {
    slug: "provider-pricing-guide",
    title: "Provider pricing: Set competitive rates and keep more of every job",
    excerpt:
      "Use our pricing calculator, understand ZapTasks fees, and learn how Stripe Connect keeps payouts fast and secure.",
    readTime: "5 min read",
    focus: "Provider playbook",
    published: "September 10, 2024",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white flex flex-col text-slate-800">
      <Navbar />
      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <span className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wide">
            ZapTasks Journal
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mt-4">Neighbourly guides for Kawarthas & GTA homeowners</h1>
          <p className="mt-3 text-slate-600">
            Practical tips, launch updates, and provider spotlights to help you get more from the ZapTasks marketplace. We post new articles every month.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {posts.map((post) => (
            <article key={post.slug} className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-wide text-blue-600 font-semibold">{post.focus}</span>
                <h2 className="text-xl font-semibold text-slate-900 mt-2">{post.title}</h2>
                <p className="text-sm text-slate-600 mt-3">{post.excerpt}</p>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <span>{post.readTime}</span>
                <span>{post.published}</span>
              </div>
              <Link
                href={`/blog/${post.slug}`}
                className="btn btn-link px-0 mt-4 self-start text-blue-700"
              >
                Read article →
              </Link>
            </article>
          ))}
        </div>
        <div className="max-w-3xl mx-auto mt-12 text-center bg-blue-50 border border-blue-100 rounded-3xl p-8">
          <h3 className="text-2xl font-semibold text-blue-900">Want more hyper-local tips?</h3>
          <p className="text-sm text-blue-900/80 mt-2">
            Join the ZapTasks newsletter for seasonal checklists, provider spotlights, and launch offers. We share what&apos;s happening across the Kawarthas & GTA service community.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
