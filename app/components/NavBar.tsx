"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, X, Zap } from "lucide-react";

const primaryLinks = [
  { href: "/pro/jobs", label: "Browse Jobs" },
  { href: "/faq", label: "Help & Safety" },
];

const signedInLinks = [{ href: "/manage-booking", label: "My Jobs" }];

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-1.5">
            <Zap className="w-5 h-5 text-emerald-500" fill="currentColor" />
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Zap<span className="text-blue-600">Tasks</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <ul className="flex items-center gap-1 text-sm font-medium text-slate-600">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === link.href
                        ? "text-blue-600 bg-blue-50"
                        : "hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <SignedIn>
                {signedInLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        pathname === link.href
                          ? "text-blue-600 bg-blue-50"
                          : "hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </SignedIn>
              <li className="ml-2">
                <SignedOut>
                  <div className="flex items-center gap-2">
                    <SignInButton mode="modal">
                      <button className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                        Sign In
                      </button>
                    </SignInButton>
                    <Link
                      href="/booking"
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Post a Job
                    </Link>
                  </div>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </li>
            </ul>
          </nav>

          {/* Mobile: auth + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <button
              className="p-1.5 rounded-lg hover:bg-slate-50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-slate-600" />
              ) : (
                <Menu className="h-5 w-5 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-3 pb-3 border-t border-slate-100 pt-3">
            <ul className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg transition-colors ${
                      pathname === link.href
                        ? "text-blue-600 bg-blue-50 font-semibold"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <SignedIn>
                {signedInLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg transition-colors ${
                        pathname === link.href
                          ? "text-blue-600 bg-blue-50 font-semibold"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </SignedIn>
              <li className="pt-2 border-t border-slate-100 mt-1">
                <Link
                  href="/booking"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-center font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Post a Job Free
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
