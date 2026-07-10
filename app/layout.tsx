import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const dynamic = "force-dynamic";

import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import ChatWidget from "./components/ChatWidget";
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
      <html lang="en" data-theme="light" className={inter.variable}>
        <head>
          <title>ZapTasks — Get paid helping your neighbours</title>
          <meta
            name="description"
            content="Browse local jobs, set your own rates, and get paid to your bank via Stripe. Free to join — ZapTasks takes 10% only when you're paid. Or post a job free and pay only when it's done."
          />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            property="og:title"
            content="ZapTasks — Get paid helping your neighbours"
          />
          <meta
            property="og:description"
            content="A Canadian marketplace for everyday jobs: snow, lawns, cleaning, odd jobs. Free to join, no lead fees, paid straight to your bank."
          />
          <meta property="og:type" content="website" />
          <meta
            property="og:url"
            content={process.env.NEXT_PUBLIC_BASE_URL || "https://zaptasks.com"}
          />
          <meta property="og:image" content="/icon.png" />
          <link rel="icon" href="/favicon.ico" />
          {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <Script
              src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
              strategy="beforeInteractive"
            />
          )}
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
        <body className="font-sans antialiased bg-slate-50 text-slate-900">
          <ChatWidget />
          {children}
          <GoogleAnalytics gaId="G-K9GLWHQEGZ" />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
