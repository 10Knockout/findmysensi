"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicPageFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === "/" || /^\/(?:app|play)(?:\/|$)/.test(path)) return children;

  return (
    <div className="public-page-frame">
      <header className="public-page-nav">
        <Link href="/" className="landing-wordmark">
          <span aria-hidden="true">F/</span> FindMySensi
        </Link>
        <nav aria-label="Public navigation">
          <Link href="/tools/calibrate">Calibrate</Link>
          <Link href="/tools/converter">Converter</Link>
          <Link href="/leaderboards">Scores</Link>
          <Link href="/#guest-play" className="public-play-link">
            Play as guest
          </Link>
        </nav>
      </header>
      {children}
      <footer className="public-page-footer">
        <Link href="/guides">Guides</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
