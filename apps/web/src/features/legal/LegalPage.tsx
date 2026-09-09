import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_NAME } from "../../lib/site.js";

/**
 * Contact + jurisdiction used across the legal pages. These are the only
 * values a lawyer review is likely to change, so they live in one place.
 * Set up real inboxes for these addresses (or forwards) before launch.
 */
export const LEGAL_CONTACT_EMAIL = "legal@findmysensi.com";
export const PRIVACY_CONTACT_EMAIL = "privacy@findmysensi.com";
export const GOVERNING_LAW = "India";
export const LEGAL_LAST_UPDATED = "2026-09-10";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-14 text-zinc-100">
      <article className="mx-auto max-w-2xl">
        <nav className="text-sm text-zinc-500">
          <Link href="/" className="text-emerald-400 hover:underline">
            {SITE_NAME}
          </Link>
        </nav>

        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
          Last updated {formatDate(LEGAL_LAST_UPDATED)}
        </p>
        <p className="mt-6 text-[15px] leading-7 text-zinc-300">{intro}</p>

        <div className="legal-body mt-8">{children}</div>

        <p className="mt-12 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          This document is provided in good faith and in plain language. It is
          not legal advice.
        </p>
      </article>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-black text-white">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-zinc-300">
        {children}
      </div>
    </section>
  );
}
