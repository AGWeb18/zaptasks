"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/app/components/NavBar";
import {
  Star,
  MapPin,
  Calendar,
  Briefcase,
  ArrowLeft,
  Shield,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface ProviderProfile {
  user_id: string;
  verified: boolean;
  services: string[];
  location: string | null;
  memberSince: string | null;
}

interface ProviderReview {
  id: string;
  rating: number;
  reviewType: string | null;
  comment: string | null;
  createdAt: string;
  jobTitle: string | null;
}

interface ProviderStats {
  totalJobs: number;
  averageRating: number;
  totalReviews: number;
}

const ProviderProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const providerId = params.providerId as string;

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [stats, setStats] = useState<ProviderStats>({
    totalJobs: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProviderProfile = async () => {
      try {
        // Reputation comes from a public, service-role endpoint. The underlying
        // provider_reviews / jobs tables are RLS-locked to the reviewing
        // homeowner and the provider, so a direct client query here would
        // silently return empty for prospective homeowners.
        const response = await fetch(
          `/api/providers/${providerId}/reputation`
        );

        if (!response.ok) {
          setError("Provider not found");
          setLoading(false);
          return;
        }

        const data = await response.json();

        setProfile({
          user_id: providerId,
          verified: Boolean(data.verified),
          services: Array.isArray(data.services) ? data.services : [],
          location: data.location ?? null,
          memberSince: data.memberSince ?? null,
        });

        const reviewsList: ProviderReview[] = Array.isArray(data.reviews)
          ? data.reviews.map(
              (review: {
                id: string;
                rating: number;
                reviewType: string | null;
                comment: string | null;
                createdAt: string;
                jobTitle: string | null;
              }) => ({
                id: review.id,
                rating: review.rating,
                reviewType: review.reviewType ?? null,
                comment: review.comment ?? null,
                createdAt: review.createdAt,
                jobTitle: review.jobTitle ?? null,
              })
            )
          : [];
        setReviews(reviewsList);

        setStats({
          totalJobs: data.completedJobs ?? 0,
          averageRating:
            typeof data.averageRating === "number" ? data.averageRating : 0,
          totalReviews: data.reviewCount ?? 0,
        });

        setLoading(false);
      } catch (err) {
        console.error("Error loading provider data:", err);
        setError("Failed to load provider profile");
        setLoading(false);
      }
    };

    if (providerId) {
      loadProviderProfile();
    }
  }, [providerId]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={`h-5 w-5 ${
              index < Math.round(rating)
                ? "text-amber-500 fill-amber-500"
                : "text-slate-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getReviewTypeBadge = (reviewType: string | null) => {
    switch (reviewType) {
      case "positive":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Positive
          </span>
        );
      case "issue":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            Had Issues
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            No Show
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading provider profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
              <h1 className="text-2xl font-bold text-slate-900 mb-4">
                Provider Not Found
              </h1>
              <p className="text-slate-600 mb-6">
                {error || "This provider profile does not exist."}
              </p>
              <Link
                href="/pro/jobs"
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Browse Jobs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost btn-sm mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.user_id.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Helper Profile
                  </h1>
                  {profile.location && (
                    <div className="flex items-center gap-2 text-slate-600 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {profile.verified && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
                  <Shield className="h-4 w-4" />
                  ID verified via Stripe
                </div>
              )}

              {profile.memberSince && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Member since{" "}
                    {format(new Date(profile.memberSince), "MMMM yyyy")}
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center bg-blue-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.totalJobs}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Completed Jobs
                </div>
              </div>
              <div className="text-center bg-amber-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-amber-600">
                  {stats.averageRating > 0
                    ? stats.averageRating.toFixed(1)
                    : "—"}
                </div>
                <div className="text-sm text-slate-600 mt-1">Avg Rating</div>
              </div>
              <div className="text-center bg-emerald-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-emerald-600">
                  {stats.totalReviews}
                </div>
                <div className="text-sm text-slate-600 mt-1">Reviews</div>
              </div>
            </div>
          </div>

          {/* Services */}
          {profile.services && profile.services.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Services Offered
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((service, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Reviews ({stats.totalReviews})
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                No reviews yet. This helper is just getting started!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {renderStars(review.rating)}
                        {review.reviewType &&
                          getReviewTypeBadge(review.reviewType)}
                      </div>
                      {review.jobTitle && (
                        <p className="text-sm text-slate-600">
                          Job: {review.jobTitle}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-slate-700 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderProfilePage;
