import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="card w-96 shadow-xl">
        <div className="card-body items-center text-center">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: "btn btn-primary w-full",
                formFieldInput: "input input-bordered w-full bg-white",
                footerActionLink: "link link-primary",
                card: "  shadow-none",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
