"use client";

import { BrowserApiClient } from "@findmysensi/api-client";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SiteBrand } from "../../src/components/SiteChrome.js";
import styles from "./AccountFrame.module.css";

const accountLinks = [
  { href: "/app", label: "Training" },
  { href: "/app/calibrate", label: "Calibrate" },
  { href: "/app/workouts", label: "Workouts" },
  { href: "/app/leaderboards", label: "Leaderboards" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/settings", label: "Settings" },
] as const;

function AccountNavigation({ pathname }: { pathname: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    const result = await new BrowserApiClient().logout();
    if (result.ok) {
      router.replace("/login");
      return;
    }
    setSignOutError(result.error || "Could not sign out. Please try again.");
    setSigningOut(false);
  }

  return (
    <>
      <button
        type="button"
        className={styles.menu}
        aria-expanded={isOpen}
        aria-controls="account-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        Menu <ChevronDown size={16} strokeWidth={1.7} aria-hidden />
      </button>
      <nav
        id="account-navigation"
        className={styles.links}
        aria-label="Training navigation"
        data-open={isOpen}
      >
        {accountLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={signOut}
          className={styles.signOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </nav>
      {signOutError && (
        <p role="alert" className="app-alert">
          {signOutError}
        </p>
      )}
    </>
  );
}

export function AccountFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={`account-frame ${styles.frame}`}>
      <header className={styles.header}>
        <div className={styles.bar}>
          <SiteBrand href="/app" />
          <AccountNavigation key={pathname} pathname={pathname} />
        </div>
      </header>
      {children}
    </div>
  );
}
