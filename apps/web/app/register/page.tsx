"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { RegisterRequestSchema } from "@findmysensi/protocol";
import { BackLink } from "../../src/components/BackLink.js";

const USERNAME_HELP =
  "3-24 characters. Use letters, numbers, underscores, or hyphens only.";
const PASSWORD_HELP =
  "At least 8 characters with one uppercase letter, one lowercase letter, and one symbol.";
const AGE_HELP = "You must confirm that you are 18 years of age or older.";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    ageAttested: false,
  });
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const MAX_RESENDS = 3;

  useEffect(() => {
    setVerificationEmail(
      sessionStorage.getItem("fms_pending_verification_email"),
    );
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const update = (
    field: "username" | "email" | "password" | "confirmPassword",
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const parsed = RegisterRequestSchema.safeParse({
      username: form.username,
      email: form.email,
      password: form.password,
      ageAttested: form.ageAttested,
    });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setError(
        firstIssue?.path[0] === "username"
          ? USERNAME_HELP
          : firstIssue?.path[0] === "email"
            ? "Enter a valid email address."
            : firstIssue?.path[0] === "ageAttested"
              ? AGE_HELP
              : PASSWORD_HELP,
      );
      return;
    }

    setLoading(true);
    try {
      const client = new BrowserApiClient();
      const result = await client.register(parsed.data);
      if (!result.ok) {
        setError(result.error ?? "Registration failed. Please try again.");
        return;
      }

      const email = parsed.data.email.trim().toLowerCase();
      setVerificationEmail(email);
      sessionStorage.setItem("fms_pending_verification_email", email);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verificationEmail) return;
    setLoading(true);
    setError(null);
    try {
      const result = await new BrowserApiClient().verifyEmailOtp(
        verificationEmail,
        otp,
      );
      if (result.ok) {
        sessionStorage.removeItem("fms_pending_verification_email");
        router.push("/login?verified=1");
        return;
      }
      setError(result.error ?? "Invalid or expired code.");
    } catch {
      setError("Could not verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (
      !verificationEmail ||
      resending ||
      resendCooldown > 0 ||
      resendCount >= MAX_RESENDS
    )
      return;
    setResending(true);
    setError(null);
    setResendMessage(null);
    try {
      const result = await new BrowserApiClient().resendEmailOtp(
        verificationEmail,
      );
      if (result.ok) {
        setResendMessage("A new verification code has been sent.");
        setResendCooldown(60);
        setResendCount((count) => count + 1);
      } else {
        setError(result.error ?? "Failed to resend verification code.");
      }
    } catch {
      setError("Failed to resend verification code.");
    } finally {
      setResending(false);
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
          <h1 className="app-heading">
            {verificationEmail ? "Verify your email" : "Create your account"}
          </h1>
          <p className="app-subtext">
            {verificationEmail
              ? `Enter the six-digit code sent to ${verificationEmail}`
              : "Create your account, verify your email, then start Gridshot."}
          </p>
        </div>

        {error ? (
          <div role="alert" className="app-alert">
            {error}
          </div>
        ) : null}

        {verificationEmail ? (
          <form onSubmit={handleVerify}>
            <div className="app-field">
              <label htmlFor="verification-otp" className="app-label">
                Verification code
              </label>
              <input
                id="verification-otp"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, ""))
                }
                className="app-input"
                style={{
                  textAlign: "center",
                  fontFamily: "monospace",
                  fontSize: 24,
                  letterSpacing: "0.4em",
                }}
              />
            </div>
            <button type="submit" disabled={loading} className="app-button">
              {loading ? "Verifying..." : "Verify Email"}
            </button>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 14,
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
              }}
            >
              <span>Need a new code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={
                  resending || resendCooldown > 0 || resendCount >= MAX_RESENDS
                }
                className="app-link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  opacity:
                    resending ||
                    resendCooldown > 0 ||
                    resendCount >= MAX_RESENDS
                      ? 0.5
                      : 1,
                }}
              >
                {resending
                  ? "Generating..."
                  : resendCount >= MAX_RESENDS
                    ? "No resends left"
                    : resendCooldown > 0
                      ? `Request again in ${resendCooldown}s`
                      : `Request new code (${MAX_RESENDS - resendCount} left)`}
              </button>
            </div>
            {resendMessage ? <p className="app-note">{resendMessage}</p> : null}
            <p className="app-help" style={{ textAlign: "center" }}>
              Verification email is sent by the configured transactional email
              provider. No fallback code is generated in the UI.
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field
              id="username"
              label="Username"
              value={form.username}
              onChange={(value) => update("username", value)}
              autoComplete="username"
              pattern="(?:[A-Za-z0-9_]|-)+"
              help={USERNAME_HELP}
            />
            <Field
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => update("email", value)}
              autoComplete="email"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(value) => update("password", value)}
              autoComplete="new-password"
              help={PASSWORD_HELP}
            />
            <Field
              id="confirmPassword"
              label="Re-enter password"
              type="password"
              value={form.confirmPassword}
              onChange={(value) => update("confirmPassword", value)}
              autoComplete="new-password"
            />
            <label
              className="app-field"
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: 14,
                border: "1px solid var(--fms-line-dark)",
                fontSize: 13,
                color: "rgba(255,255,255,0.72)",
              }}
            >
              <input
                id="age-attestation"
                name="ageAttested"
                type="checkbox"
                required
                checked={form.ageAttested}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ageAttested: event.target.checked,
                  }))
                }
                style={{ marginTop: 2, accentColor: "var(--fms-acid)" }}
              />
              <span>I confirm that I am 18 years of age or older.</span>
            </label>
            <p className="app-help" style={{ marginBottom: 18 }}>
              FindMySensi records this age-policy attestation only. We do not
              ask for or store your date of birth.
            </p>
            <button type="submit" disabled={loading} className="app-button">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <p className="app-note">
          Already registered?{" "}
          <Link href="/login" className="app-link">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  pattern?: string;
  help?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  pattern,
  help,
}: FieldProps) {
  return (
    <div className="app-field">
      <label htmlFor={id} className="app-label">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        pattern={pattern}
        minLength={id === "username" ? 3 : undefined}
        maxLength={id === "username" ? 24 : 100}
        className="app-input"
      />
      {help ? <p className="app-help">{help}</p> : null}
    </div>
  );
}
