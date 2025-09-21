"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

const primaryLinks = [
  { href: "/booking", label: "Post a Job" },
  { href: "/pro/jobs", label: "Browse Jobs" },
  { href: "/faq", label: "Help & Safety" },
];

const signedInLinks = [{ href: "/manage-booking", label: "My Jobs" }];

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-blue-600">ZapTasks</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-5 items-center text-sm font-medium text-gray-600">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-blue-600 transition-colors"
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
                      className="hover:text-blue-600 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </SignedIn>
              <li>
                <SignedOut>
                  <SignInButton />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </li>
            </ul>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4">
            <ul className="flex flex-col space-y-3 text-gray-600">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block hover:text-blue-600"
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
                      className="block hover:text-blue-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </SignedIn>
              <li>
                <SignedOut>
                  <SignInButton />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
