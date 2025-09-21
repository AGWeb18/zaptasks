import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <title>ZapTasks - Home Services Marketplace in Kawarthas & GTA</title>
          <meta
            name="description"
            content="Connect homeowners with trusted local providers for cleaning, handyman, yard work, and more in the Kawarthas and GTA. Canadian-owned platform with secure payments."
          />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            property="og:title"
            content="ZapTasks - Reliable Home Services"
          />
          <meta
            property="og:description"
            content="Book local pros for your home needs. Fast, secure, and community-focused."
          />
          <meta property="og:type" content="website" />
          <meta
            property="og:url"
            content={process.env.NEXT_PUBLIC_BASE_URL || "https://zaptasks.com"}
          />
          <meta property="og:image" content="/icon.png" />
          <link rel="icon" href="/favicon.ico" />
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-K9GLWHQEGZ"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-K9GLWHQEGZ');
  `}
          </Script>
        </head>
        <body>
          <main>{children}</main>
          <GoogleAnalytics gaId="G-K9GLWHQEGZ" />
        </body>
      </html>
    </ClerkProvider>
  );
}
