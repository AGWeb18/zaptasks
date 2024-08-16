
// This is a client component for the back button
'use client'

import { useRouter } from 'next/navigation'  // Usage: App router
import { ArrowLeft } from 'lucide-react';

function BackButton() {
  const router = useRouter();
  return (
    <button className="btn btn-ghost mb-8 text-lg" onClick={() => router.back()}>
      <ArrowLeft className="mr-2 h-6 w-6" /> Back to Tasks
    </button>
  );
}