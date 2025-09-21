import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="mb-4">The page you are looking for does not exist.</p>
      <Link href="/" className="btn btn-primary">
        Go Home
      </Link>
    </div>
  );
}
