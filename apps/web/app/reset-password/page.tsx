"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    setLoading(true);

    const client = new BrowserApiClient();
    const result = await client.resetPassword({ token, newPassword: password });

    if (result.ok) {
      router.push("/login?reset=1");
    } else {
      setError(
        result.error || "Password reset failed. The link may have expired.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="app-card">
      <div className="app-card-header">
        <Link
          href="/"
          className="landing-wordmark"
          style={{ justifyContent: "center", marginBottom: 22 }}
        >
          <span>FMS</span>FindMySensi
        </Link>
        <h1 className="app-heading">Set New Password</h1>
        <p className="app-subtext">Enter your new secure password</p>
      </div>

      {error && <div className="app-alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="app-field">
          <label className="app-label">New Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="app-input"
          />
        </div>

        <div className="app-field">
          <label className="app-label">Confirm New Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="app-input"
          />
        </div>

        <button type="submit" disabled={loading} className="app-button">
          {loading ? "Updating Password..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="app-shell">
      <Suspense
        fallback={
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            LOADING...
          </p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
