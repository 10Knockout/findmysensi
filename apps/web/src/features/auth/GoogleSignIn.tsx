"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BrowserApiClient } from "@findmysensi/api-client";
import { resolveSafeLoginDestination } from "./login-next.js";

export function GoogleSignIn() {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = new BrowserApiClient();
    let active = true;
    if (new URLSearchParams(window.location.search).get("oauth") === "failed") {
      setError(
        "Google sign-in did not complete. Try again or sign in with email. If you already have an email account, use that sign-in method.",
      );
    }
    void client.supportsGoogleSignIn().then((available) => {
      if (active) setEnabled(available);
    });
    return () => {
      active = false;
    };
  }, []);

  async function proceed() {
    if (pending) return;
    setPending(true);
    setError(null);
    const destination = resolveSafeLoginDestination(window.location.search);
    const result = await new BrowserApiClient().startGoogleSignIn(destination);
    if (result.ok && result.data?.url) {
      try {
        const url = new URL(result.data.url);
        if (
          url.origin === "https://accounts.google.com" &&
          url.pathname === "/o/oauth2/v2/auth" &&
          !url.username &&
          !url.password
        ) {
          window.location.assign(url.href);
          return;
        }
      } catch {
        // Treat an invalid authorization URL as an unavailable provider.
      }
    }
    setError(
      "Google sign-in is unavailable. Try again in a moment or sign in with email.",
    );
    setPending(false);
  }

  if (!enabled && !error) return null;

  return (
    <div className="app-google-signin">
      {error && (
        <div role="alert" className="app-alert">
          {error}
        </div>
      )}
      {enabled && (
        <>
          <button
            className="app-google-button"
            type="button"
            onClick={proceed}
            disabled={pending}
          >
            <Image
              alt=""
              src="/google-g.png"
              width={18}
              height={18}
              unoptimized
            />
            {pending ? "Opening Google…" : "Continue with Google"}
          </button>
          <p className="app-google-divider">Or continue with email</p>
        </>
      )}
    </div>
  );
}
