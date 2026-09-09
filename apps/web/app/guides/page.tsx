import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, absoluteUrl } from "../../src/lib/site.js";
import { GUIDES } from "../../src/features/guides/registry.js";

const TITLE = "Aim & Sensitivity Guides";
const DESCRIPTION =
  "Plain-English guides to mouse sensitivity for aiming: what cm/360 means, how to convert between games, and a repeatable method for choosing your own sensitivity.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/guides"),
    type: "website",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      name: TITLE,
      url: absoluteUrl("/guides"),
      description: DESCRIPTION,
      hasPart: GUIDES.map((guide) => ({
        "@type": "Article",
        headline: guide.title,
        url: absoluteUrl(`/guides/${guide.slug}`),
      })),
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
          name: "Guides",
          item: absoluteUrl("/guides"),
        },
      ],
    },
  ],
};

export default function GuidesHubPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-14 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-400 hover:underline"
        >
          &larr; {SITE_NAME}
        </Link>
        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          Aim &amp; Sensitivity Guides
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-zinc-400">
          {DESCRIPTION}
        </p>

        <ul className="mt-10 space-y-4">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-emerald-500/40"
              >
                <h2 className="text-lg font-bold text-white">{guide.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {guide.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </main>
  );
}
