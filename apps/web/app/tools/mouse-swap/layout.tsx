import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, absoluteUrl } from "../../../src/lib/site.js";
import {
  FaqSection,
  type FaqItem,
} from "../../../src/features/guides/FaqSection.js";

const TITLE = "Mouse DPI Swap Calculator — Keep the Same Aim on a New Mouse";
const DESCRIPTION =
  "Changed mouse or DPI? Enter your old DPI, new DPI and in-game sensitivity to get the sensitivity that keeps your cm/360 and muscle memory identical.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/mouse-swap" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/tools/mouse-swap"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const FAQ: readonly FaqItem[] = [
  {
    q: "How do I keep the same aim after changing my mouse DPI?",
    a: "Scale your in-game sensitivity by the inverse of the DPI change. New sensitivity = old sensitivity x (old DPI / new DPI). This holds eDPI and cm/360 constant, so your aim feels identical.",
  },
  {
    q: "Is it better to raise DPI or in-game sensitivity?",
    a: "For a fixed cm/360 the two are close to equivalent, but very low DPI (below 400) can add sensor latency and very high in-game sensitivity can amplify smoothing or rounding. 800 or 1600 DPI with a moderate in-game value is a safe default.",
  },
  {
    q: "Does a new mouse with the same DPI need any change?",
    a: "Usually not for rotation. Two mice set to the same true DPI produce the same cm/360. Differences you feel are typically weight, shape, sensor acceleration or polling rate, not sensitivity.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "FindMySensi Mouse DPI Swap Calculator",
      url: absoluteUrl("/tools/mouse-swap"),
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (web browser)",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: DESCRIPTION,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Mouse DPI Swap",
          item: absoluteUrl("/tools/mouse-swap"),
        },
      ],
    },
  ],
};

export default function MouseSwapLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FaqSection items={FAQ} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
