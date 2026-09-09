import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME, absoluteUrl } from "../../../src/lib/site.js";
import {
  FaqSection,
  type FaqItem,
} from "../../../src/features/guides/FaqSection.js";

const TITLE = "Sensitivity Converter — Valorant, CS2, Apex & Aim Lab";
const DESCRIPTION =
  "Free mouse sensitivity converter. Move your aim between Valorant, CS2, Apex Legends and Aim Lab with matched cm/360, in/360, eDPI and counts/360 — no FOV folklore.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/converter" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/tools/converter"),
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
    q: "How do I convert my sensitivity between games?",
    a: "Keep your DPI the same and match cm/360 — the physical distance your mouse travels for a full 360-degree turn. Enter your current game, sensitivity and DPI, and the converter outputs the matched value plus cm/360, in/360, counts/360 and source eDPI.",
  },
  {
    q: "Does FOV change my mouse sensitivity?",
    a: "No. Field of view changes what you see, not how far the mouse rotates the camera. Hipfire mouse rotation is governed by your sensitivity and DPI only. Aim-down-sights and scoped sensitivity are separate multipliers handled per game.",
  },
  {
    q: "What is cm/360?",
    a: "cm/360 is the number of centimetres you move your mouse to rotate a full circle in game. It is the only sensitivity measure that stays constant across titles, which is why every correct conversion preserves it.",
  },
  {
    q: "What is eDPI and should I convert with it?",
    a: "eDPI is in-game sensitivity multiplied by mouse DPI. It is a quick way to compare two players inside the same game, but it is not comparable across games because each game scales sensitivity differently. Convert with cm/360, not raw eDPI.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "FindMySensi Sensitivity Converter",
      url: absoluteUrl("/tools/converter"),
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
          name: "Sensitivity Converter",
          item: absoluteUrl("/tools/converter"),
        },
      ],
    },
  ],
};

export default function ConverterLayout({ children }: { children: ReactNode }) {
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
