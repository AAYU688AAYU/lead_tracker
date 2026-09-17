import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/app/components/toast-provider";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const rootDomain = process.env.ROOT_DOMAIN || 'apexcrm.com';

export const metadata: Metadata = {
  title: "Apex CRM",
  description: "Admissions pipeline management for consultants and admins.",
  metadataBase: new URL(appUrl),
  
  // OpenGraph tags for social sharing
  openGraph: {
    title: "Apex CRM",
    description: "Streamline your admissions process with Apex CRM. Manage leads, track conversations, and monitor student progress in one place.",
    type: "website",
    url: appUrl,
    siteName: "Apex CRM",
    locale: "en_US",
    images: [
      {
        url: `${appUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Apex CRM - Admissions Pipeline Management",
      },
      {
        url: `${appUrl}/og-image-square.png`,
        width: 400,
        height: 400,
        alt: "Apex CRM Logo",
      },
    ],
  },

  // Twitter Card tags for Twitter sharing
  twitter: {
    card: "summary_large_image",
    title: "Apex CRM",
    description: "Streamline your admissions process with Apex CRM. Manage leads, track conversations, and monitor student progress in one place.",
    images: [`${appUrl}/og-image.png`],
    creator: "@apexcrm",
    site: "@apexcrm",
  },

  // Additional metadata
  keywords: [
    "admissions",
    "CRM",
    "pipeline",
    "student management",
    "education",
    "lead tracking",
    "consultant tool",
  ],
  authors: [{ name: "Apex CRM" }],
  creator: "Apex CRM",
  publisher: "Apex CRM",
  
  // Icons and app metadata
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Apex CRM",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#FAFAF9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Preconnect to external services for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for analytics and third-party services */}
        <link rel="dns-prefetch" href="https://api.supabase.co" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={appUrl} />
        
        {/* Robots and sitemap */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="sitemap" href="/sitemap.xml" />
        
        {/* Additional security headers */}
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Search engine verification (if needed) */}
        {/* <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_CODE" />
        <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" /> */}
      </head>
      <body className="min-h-full flex flex-col antialiased">
        {/* Skip to main content link — visible on focus only */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        
        {/* Toast provider for error/success notifications */}
        <ToastProvider>
          {/* Main content wrapper */}
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
