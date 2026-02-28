import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZapTasks",
  description: "Your community marketplace for getting help and earning extra.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body className="font-sans">
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">{children}</main>
        </div>
      </body>
    </html>
  );
}
