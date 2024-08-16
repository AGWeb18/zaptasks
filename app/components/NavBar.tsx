import React from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const Navbar: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <a href="/">
          <h1 className="text-2xl font-bold text-blue-600">ZapTasks</h1>
        </a>
        <nav>
          <ul className="flex space-x-4">
            {/* <li><a href="/zaptasks" className="text-gray-600 hover:text-blue-600">Tasks</a></li> */}
            <li>
              <a href="/booking" className="text-gray-600 hover:text-blue-600">
                Book Now
              </a>
            </li>
            <li>
              <a
                href="/manage-booking"
                className="text-gray-600 hover:text-blue-600"
              >
                Manage Bookings
              </a>
            </li>
            <li>
              {" "}
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
