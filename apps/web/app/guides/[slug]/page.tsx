import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  SITE_NAME,
  AUTHOR_NAME,
  AUTHOR_URL,
  absoluteUrl,
} from "../../../src/lib/site.js";
import { GUIDES, getGuide } from "../../../src/features/guides/registry.js";
import { GUIDE_CONTENT } from "../../../src/features/guides/content.js";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  const url = absoluteUrl(`/guides/${guide.slug}`);
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: "article",
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      url,
      modifiedTime: guide.updated,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const content = GUIDE_CONTENT[slug];
  if (!guide || !content) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        url: absoluteUrl(`/guides/${guide.slug}`),
        dateModified: guide.updated,
        datePublished: guide.updated,
        author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
        publisher: { "@id": absoluteUrl("/#organization") },
        mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
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
          {
            "@type": "ListItem",
            position: 3,
            name: guide.title,
            item: absoluteUrl(`/guides/${guide.slug}`),
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-14 text-zinc-100">
      <article className="mx-auto max-w-2xl">
        <nav className="text-sm text-zinc-500">
          <Link href="/" className="text-emerald-400 hover:underline">
            {SITE_NAME}
          </Link>
          <span className="px-2">/</span>
          <Link href="/guides" className="text-emerald-400 hover:underline">
            Guides
          </Link>
        </nav>

        <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
          Updated{" "}
          {new Date(guide.updated).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <p className="mt-6 border-l-2 border-emerald-500/50 pl-4 text-base leading-7 text-zinc-200">
          {content.lede}
        </p>

        {content.body}

        <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm text-zinc-300">
            Put it into practice with the free{" "}
            <Link
              href="/tools/converter"
              className="font-semibold text-emerald-400 hover:underline"
            >
              sensitivity converter
            </Link>{" "}
            or{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-400 hover:underline"
            >
              start training
            </Link>
            .
          </p>
        </div>
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </main>
  );
}
