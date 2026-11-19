import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AUTHOR_NAME, AUTHOR_URL, GITHUB_URL, SITE_NAME } from "../lib/site.js";
import styles from "./SiteChrome.module.css";

export function SiteBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className={`landing-wordmark ${styles.brand}`} href={href}>
      <span aria-hidden="true">F/</span>
      {SITE_NAME}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBar}>
        <span className={styles.footerBrand}>{SITE_NAME}</span>
        <nav className={styles.footerLinks} aria-label="Footer navigation">
          <Link href="/guides">Guides</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            Source <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
          </a>
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer">
            Report an issue
          </a>
          <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
            {AUTHOR_NAME}
          </a>
          <a
            href="https://www.youtube.com/@KOgamerX"
            target="_blank"
            rel="noreferrer"
            aria-label="FindMySensi on YouTube"
          >
            YouTube
          </a>
        </nav>
      </div>
    </footer>
  );
}
