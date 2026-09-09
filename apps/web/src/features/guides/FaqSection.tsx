import type { ReactNode } from "react";

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Renders a visible FAQ list AND the matching `FAQPage` JSON-LD from one array,
 * so the structured data always reflects on-page content (a Google
 * requirement). Drop this after `{children}` inside a route's server layout.
 */
export function FaqSection({
  items,
  heading = "Frequently asked questions",
}: {
  items: readonly FaqItem[];
  heading?: string;
}): ReactNode {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="mx-auto max-w-4xl px-6 pb-16 text-zinc-100">
      <h2 className="text-xl font-black text-white">{heading}</h2>
      <dl className="mt-6 space-y-6">
        {items.map((item) => (
          <div
            key={item.q}
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5"
          >
            <dt className="font-semibold text-white">{item.q}</dt>
            <dd className="mt-2 text-sm leading-6 text-zinc-300">{item.a}</dd>
          </div>
        ))}
      </dl>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
