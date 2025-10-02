import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const dynamic = "force-dynamic";

import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import ChatWidget from "./components/ChatWidget";
import NewsletterModal from "./components/NewsletterModal";
import { Analytics } from "@vercel/analytics/next";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hotjarId = process.env.NEXT_PUBLIC_HOTJAR_ID;
  const hotjarVersion = process.env.NEXT_PUBLIC_HOTJAR_VERSION || "6";

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <title>ZapTasks - Canadian Home Services Marketplace</title>
          <meta
            name="description"
            content="Connect homeowners across Canada with trusted local providers for cleaning, handyman, yard work, and more. Canadian-owned platform with secure payments."
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
          {hotjarId ? (
            <Script id="hotjar" strategy="afterInteractive">
              {`
                (function(h,o,t,j,a,r){
                  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                  h._hjSettings={hjid:${hotjarId},hjsv:${hotjarVersion}};
                  a=o.getElementsByTagName('head')[0];
                  r=o.createElement('script');r.async=1;
                  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                  a.appendChild(r);
                })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
              `}
            </Script>
          ) : null}
        </head>
        <body className="font-sans bg-slate-50 text-slate-900">
          <ChatWidget />
          <NewsletterModal />
          <main>{children}</main>
          <GoogleAnalytics gaId="G-K9GLWHQEGZ" />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
