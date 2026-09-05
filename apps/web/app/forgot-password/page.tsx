"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BrowserApiClient } from "@findmysensi/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const client = new BrowserApiClient();
    await client.forgotPassword({ email });

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <main className="app-shell">
      <div className="app-card">
        <div className="app-card-header">
          <Link
            href="/"
            className="landing-wordmark"
            style={{ justifyContent: "center", marginBottom: 22 }}
          >
            <span>FMS</span>FindMySensi
          </Link>
          <h1 className="app-heading">Reset Password</h1>
          <p className="app-subtext">
            We will send a password reset link to your email
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p className="app-subtext" style={{ marginBottom: 24 }}>
              If an account exists for{" "}
              <strong style={{ color: "white" }}>{email}</strong>, you will
              receive instructions to reset your password.
            </p>
            <Link href="/login" className="app-button-ghost app-button">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="app-field">
              <label className="app-label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="app-input"
              />
            </div>

            <button type="submit" disabled={loading} className="app-button">
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>

            <p className="app-note">
              <Link href="/login" className="app-link">
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
