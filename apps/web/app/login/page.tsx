"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { resolveSafeLoginDestination } from "../../src/features/auth/login-next.js";
import { BackLink } from "../../src/components/BackLink.js";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const client = new BrowserApiClient();
    const result = await client.login({ email, password });

    if (result.ok) {
      router.push(resolveSafeLoginDestination(window.location.search));
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="app-card">
        <BackLink href="/" label="Back to home" />
        <div className="app-card-header">
          <Link
            href="/"
            className="landing-wordmark"
            style={{ justifyContent: "center", marginBottom: 22 }}
          >
            <span>FMS</span>FindMySensi
          </Link>
          <h1 className="app-heading">Sign In</h1>
          <p className="app-subtext">Sign in to access aim training</p>
        </div>

        {error && <div className="app-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="app-field">
            <label htmlFor="login-email" className="app-label">
              Email Address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="app-input"
            />
          </div>

          <div className="app-field">
            <label htmlFor="login-password" className="app-label">
              Password
              <Link
                href="/forgot-password"
                className="app-link"
                style={{ fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="app-input"
            />
          </div>

          <button type="submit" disabled={loading} className="app-button">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="app-note">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="app-link">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
