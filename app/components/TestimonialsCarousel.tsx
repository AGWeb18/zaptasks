"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import clsx from "clsx";

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  rating: number;
  quote: string;
  location: string;
};

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  intervalMs?: number;
  className?: string;
}

export function TestimonialsCarousel({
  testimonials,
  intervalMs = 6000,
  className,
}: TestimonialsCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!testimonials.length) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, testimonials.length]);

  if (!testimonials.length) return null;

  const current = testimonials[index];

  return (
    <div
      className={clsx(
        "relative bg-white rounded-2xl shadow-lg p-8 border border-slate-100 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-blue-50 via-transparent to-transparent opacity-70" />
      <div className="relative">
        <div className="flex items-center gap-1 text-amber-500 mb-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={`star-${idx}`}
              className={clsx("h-4 w-4", idx < Math.round(current.rating) ? "opacity-100" : "opacity-30")}
              fill={idx < Math.round(current.rating) ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          ))}
          <span className="ml-2 text-xs uppercase tracking-wide text-blue-700">
            Community verified
          </span>
        </div>
        <blockquote className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed">
          “{current.quote}”
        </blockquote>
        <footer className="mt-6">
          <div className="text-sm font-medium text-slate-900">{current.name}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            {current.role} • {current.location}
          </div>
        </footer>
      </div>
      <div className="mt-6 flex justify-center gap-2">
        {testimonials.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIndex(idx)}
            className={clsx(
              "h-2.5 w-6 rounded-full transition-all",
              idx === index ? "bg-blue-600 w-8" : "bg-slate-200 hover:bg-slate-300",
            )}
            aria-label={`Show testimonial ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default TestimonialsCarousel;
