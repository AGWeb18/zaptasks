"use client";

import React from 'react';
import Link from 'next/link';


interface BookNowButtonProps {
  className?: string;
}

const BookNowButton: React.FC<BookNowButtonProps> = ({ className = '' }) => {

  return (
    <Link href="/booking">
    <button 
      className={`btn btn-lg bg-primary text-xl w-full text-white ${className}`}
    >
      Book Now
    </button>
    </Link>
  );
};

export default BookNowButton;