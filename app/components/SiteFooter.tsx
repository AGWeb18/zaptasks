import Link from "next/link";
import { Mail, MapPin, ShieldCheck } from "lucide-react";

const footerLinks = [
  { href: "/booking", label: "Post a Job" },
  { href: "/pro/jobs", label: "Find Local Jobs" },
  { href: "/faq", label: "Help & Safety" },
  { href: "/legal", label: "Privacy & Terms" },
];

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-200 pt-12 pb-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h3 className="text-lg font-semibold mb-3">ZapTasks</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Canadian-built marketplace connecting homeowners with trusted
              local pros from coast to coast. Secure payments keep every booking
              transparent, and shared ratings help you spot neighbours who
              consistently deliver.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Stripe Connect payouts & dispute support
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-3">
              Quick links
            </h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-3">
              Service areas
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Ontario communities</li>
              <li>Prairie cities</li>
              <li>Quebec & Atlantic provinces</li>
              <li>British Columbia & the North</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-3">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                Canada-wide support (Toronto HQ)
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400" />
                <Link
                  href="mailto:myzaptasks@gmail.com"
                  className="hover:text-white"
                >
                  myzaptasks@gmail.com
                </Link>
              </li>
              <li>Mon–Sat • 8am–8pm Eastern</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-700 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <span>
            &copy; {new Date().getFullYear()} ZapTasks Inc. Proudly Canadian 🇨🇦
          </span>
          <div className="flex gap-4">
            <Link href="/legal" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/legal" className="hover:text-white">
              Terms
            </Link>
            <Link href="/faq" className="hover:text-white">
              Dispute resolution
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
