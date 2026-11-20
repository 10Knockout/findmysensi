"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import styles from "./LandingRestore.module.css";

function NavigationLinks() {
  return (
    <>
      <a href="#training">Training</a>
      <a href="#calibration">Calibration</a>
      <Link href="/tools/converter">Converter</Link>
      <a href="#leaderboard">Scores</a>
    </>
  );
}

export function LandingNavigation() {
  return (
    <header className="landing-nav">
      <a href="#top" className="landing-wordmark">
        <span aria-hidden="true">F/</span> FindMySensi
      </a>
      <nav aria-label="Main navigation" className="landing-nav-links">
        <NavigationLinks />
      </nav>
      <div className="landing-nav-actions">
        <Link href="/login" className="landing-login">
          Sign in
        </Link>
        <a
          href="#guest-play"
          className="landing-pill landing-pill-light"
          aria-label="Play as guest"
        >
          Play free
        </a>
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
            <Menu size={20} aria-hidden="true" />
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
            <NavigationLinks />
            <Link href="/login">Sign in</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
