import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlobalStudy | B2B2C Educational Placement Agency CRM",
  description: "Cloud-Native Serverless Educational Placement Brokerage CRM built on Next.js 15 and Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
