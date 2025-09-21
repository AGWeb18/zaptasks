"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

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
              <li>
                <Link
                  href="/providers"
                  className="hover:text-blue-600 transition-colors"
                >
                  Find Services
                </Link>
              </li>
              <li>
                <Link
                  href="/booking"
                  className="hover:text-blue-600 transition-colors"
                >
                  Book a Service
                </Link>
              </li>
              <li>
                <Link
                  href="/become-provider"
                  className="hover:text-blue-600 transition-colors"
                >
                  Offer Your Skills
                </Link>
              </li>
              <li>
                <Link
                  href="/pro/jobs"
                  className="hover:text-blue-600 transition-colors"
                >
                  Open Jobs
                </Link>
              </li>
              <li>
                <SignedIn>
                  <Link
                    href="/manage-booking"
                    className="hover:text-blue-600 transition-colors"
                  >
                    My Job Requests
                  </Link>
                </SignedIn>
              </li>
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
              <li>
                <Link
                  href="/providers"
                  className="block hover:text-blue-600"
                >
                  Find Services
                </Link>
              </li>
              <li>
                <Link
                  href="/booking"
                  className="block hover:text-blue-600"
                >
                  Book a Service
                </Link>
              </li>
              <li>
                <Link
                  href="/become-provider"
                  className="block hover:text-blue-600"
                >
                  Offer Your Skills
                </Link>
              </li>
              <li>
                <Link
                  href="/pro/jobs"
                  className="block hover:text-blue-600"
                >
                  Open Jobs
                </Link>
              </li>
              <li>
                <SignedIn>
                  <Link
                    href="/manage-booking"
                    className="block hover:text-blue-600"
                  >
                    My Job Requests
                  </Link>
                </SignedIn>
              </li>
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
