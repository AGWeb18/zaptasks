"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface SubscriptionButtonProps {
  stripeLink: string;
}

const SubscriptionButton: React.FC<SubscriptionButtonProps> = ({
  stripeLink,
}) => {
  const { isSignedIn } = useUser();
  const router = useRouter();

  const handleClick = () => {
    if (isSignedIn) {
      // User is logged in, redirect to Stripe payment link
      window.location.href = stripeLink;
    } else {
      // User is not logged in, redirect to login page
      router.push("/login");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700 transition duration-300"
    >
      Select Package
    </button>
  );
};

export default SubscriptionButton;
