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
            <ul className="flex space-x-4 items-center">
              <li>
                <Link
                  href="/booking"
                  className="text-gray-600 hover:text-blue-600"
                >
                  Book Now
                </Link>
              </li>
              <li>
                <Link
                  href="/manage-booking"
                  className="text-gray-600 hover:text-blue-600"
                >
                  Manage Bookings
                </Link>
              </li>
              <li>
                <Link
                  href="/subscriptions"
                  className="text-gray-600 hover:text-blue-600"
                >
                  Subscriptions
                </Link>
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
            <ul className="flex flex-col space-y-2">
              <li>
                <Link
                  href="/booking"
                  className="block text-gray-600 hover:text-blue-600"
                >
                  Book Now
                </Link>
              </li>
              <li>
                <Link
                  href="/manage-booking"
                  className="block text-gray-600 hover:text-blue-600"
                >
                  Manage Bookings
                </Link>
              </li>
              <li>
                <Link
                  href="/subscriptions"
                  className="block text-gray-600 hover:text-blue-600"
                >
                  Subscriptions
                </Link>
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
