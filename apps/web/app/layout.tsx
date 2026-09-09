import type { Metadata, Viewport } from "next";
import React from "react";
import { Turret_Road } from "next/font/google";
import "./globals.css";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  GITHUB_URL,
  AUTHOR_NAME,
  AUTHOR_URL,
  absoluteUrl,
} from "../src/lib/site.js";

const turretRoad = Turret_Road({
  variable: "--font-turret-road",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Free Browser Aim Trainer & Sensitivity Converter`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "aim trainer",
    "browser aim trainer",
    "free aim trainer",
    "sensitivity converter",
    "cm/360 calculator",
    "eDPI calculator",
    "valorant sensitivity converter",
    "cs2 sensitivity converter",
    "mouse dpi swap",
    "flick training",
  ],
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
  creator: AUTHOR_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — Free Browser Aim Trainer & Sensitivity Converter`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Free Browser Aim Trainer`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "games",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

// Per-request CSP nonces require dynamic rendering so Next can attach the
// middleware-generated nonce to framework and inline scripts.
export const dynamic = "force-dynamic";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/icon.svg"),
      sameAs: [GITHUB_URL, AUTHOR_URL],
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": absoluteUrl("/#organization") },
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": absoluteUrl("/#webapp"),
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "GameApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements:
        "Requires a modern desktop browser with pointer lock",
      description: SITE_DESCRIPTION,
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      publisher: { "@id": absoluteUrl("/#organization") },
      license: "https://www.mozilla.org/en-US/MPL/2.0/",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={turretRoad.variable}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-50 min-h-screen m-0 p-0">
        {children}
        <script
          type="application/ld+json"
          // JSON-LD is a data block, not executable script; it is not subject
          // to the nonce CSP and is safe to inline here.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
