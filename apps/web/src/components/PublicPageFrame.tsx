"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";
import { SiteBrand, SiteFooter } from "./SiteChrome.js";
import styles from "./SiteChrome.module.css";

const destinations = [
  { label: "Calibrate", href: "/tools/calibrate" },
  { label: "Converter", href: "/tools/converter" },
  { label: "Leaderboards", href: "/leaderboards" },
];

function GuestPlayLink() {
  return (
    <Link
      href="/#guest-play"
      className={`landing-pill landing-pill-light ${styles.primary}`}
      aria-label="Play as guest"
    >
      <span className={styles.fullPlayLabel}>Play as guest</span>
      <span className={styles.shortPlayLabel} aria-hidden>
        Play
      </span>
      <ArrowRight
        className={styles.playArrow}
        size={15}
        strokeWidth={1.8}
        aria-hidden
      />
    </Link>
  );
}

function PublicDestinations({ path }: { path: string }) {
  return (
    <>
      <Link href="/#training">Train</Link>
      {destinations.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </>
  );
}

function PublicHeader({ path }: { path: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <SiteBrand />
        <nav className={styles.links} aria-label="Main navigation">
          <PublicDestinations path={path} />
        </nav>
        <div className={styles.actions}>
          <Link
            className={styles.login}
            href="/login"
            aria-current={path === "/login" ? "page" : undefined}
          >
            Log in
          </Link>
          <GuestPlayLink />
          <details
            className={styles.mobileMenu}
            onKeyDown={(event) => {
              if (event.key === "Escape" && event.currentTarget.open) {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Menu">
              <Menu size={21} strokeWidth={1.7} aria-hidden />
            </summary>
            <nav
              aria-label="Mobile navigation"
              onClick={(event) => {
                if (
                  event.target instanceof Element &&
                  event.target.closest("a")
                ) {
                  const menu = event.currentTarget.closest("details");
                  if (menu) menu.open = false;
                }
              }}
            >
              <PublicDestinations path={path} />
              <Link
                href="/login"
                aria-current={path === "/login" ? "page" : undefined}
              >
                Log in
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function PublicPageFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === "/" || /^\/(?:app|play)(?:\/|$)/.test(path)) return children;

  return (
    <div className={`site-frame ${styles.frame}`}>
      <PublicHeader path={path} />
      {children}
      <SiteFooter />
    </div>
  );
}
