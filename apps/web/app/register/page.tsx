"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { RegisterRequestSchema } from "@findmysensi/protocol";

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
    () => {
      if (typeof window !== "undefined") {
        return sessionStorage.getItem("fms_pending_verification_email");
      }
      return null;
    },
  );
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !verificationEmail) {
      setDevOtp(null);
      return;
    }

    let active = true;
    const pollDevOtp = async () => {
      try {
        const response = await fetch("/api/v1/dev/verification-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: verificationEmail }),
        });
        if (response.ok && active) {
          const data = (await response.json()) as { otp?: string };
          if (data.otp) {
            setDevOtp(data.otp);
          }
        }
      } catch {
        // Dev endpoint only; ignore if unavailable
      }
    };

    void pollDevOtp();
    const interval = setInterval(pollDevOtp, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [verificationEmail]);

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
    const client = new BrowserApiClient();
    const result = await client.register(parsed.data);
    if (!result.ok) {
      setError(result.error ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    setVerificationEmail(email);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("fms_pending_verification_email", email);
    }
    setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    setLoading(false);
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verificationEmail) return;
    setLoading(true);
    setError(null);
    const result = await new BrowserApiClient().verifyEmailOtp(
      verificationEmail,
      otp,
    );
    if (result.ok) {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("fms_pending_verification_email");
      }
      router.push("/login?verified=1");
      return;
    }
    setError(result.error ?? "Invalid or expired code.");
    setLoading(false);
  };

  const handleResend = async () => {
    if (!verificationEmail || resending || resendCooldown > 0) return;
    setResending(true);
    setError(null);
    setResendMessage(null);
    const client = new BrowserApiClient();
    const result = await client.resendEmailOtp(verificationEmail);
    if (result.ok) {
      setResendMessage("A new verification code has been sent.");
      setResendCooldown(30);
      const freshOtp =
        await client.getDevelopmentVerificationOtp(verificationEmail);
      if (freshOtp) {
        setDevOtp(freshOtp);
      }
    } else {
      setError(result.error ?? "Failed to resend verification code.");
    }
    setResending(false);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      {devOtp ? (
        <aside
          aria-label="Development OTP notification"
          className="fixed right-6 top-6 z-50 flex items-center gap-4 rounded-xl border border-emerald-500/40 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded border border-emerald-800/60 bg-emerald-950 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Local Dev OTP
              </span>
              <span className="text-xs text-zinc-400">No SMTP needed</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black tracking-widest text-emerald-300">
                {devOtp}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOtp(devOtp)}
            className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 transition hover:bg-emerald-300 active:scale-95"
          >
            Auto-fill
          </button>
        </aside>
      ) : null}
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-emerald-400 text-lg font-black text-black">
              S
            </span>
            <span className="text-xl font-bold text-white">FindMySensi</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {verificationEmail ? "Verify your email" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {verificationEmail
              ? `Enter the six-digit code sent to ${verificationEmail}`
              : "Create your account, verify your email, then start Gridshot."}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200"
          >
            {error}
          </div>
        ) : null}

        {verificationEmail ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <label
              htmlFor="verification-otp"
              className="block text-sm font-semibold text-zinc-200"
            >
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
              className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-white focus:border-emerald-400 focus:outline-none"
            />
            <button
              disabled={loading}
              className="w-full rounded-lg bg-emerald-400 px-4 py-3 font-bold text-zinc-950 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>
            <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
              <span>Need a new code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="font-medium text-emerald-400 hover:text-emerald-300 disabled:text-zinc-600 disabled:cursor-not-allowed"
              >
                {resending
                  ? "Generating..."
                  : resendCooldown > 0
                    ? `Request again in ${resendCooldown}s`
                    : "Request new code"}
              </button>
            </div>
            {resendMessage ? (
              <p className="text-center text-xs text-emerald-400">
                {resendMessage}
              </p>
            ) : null}
            <p className="text-center text-xs text-zinc-500">
              {devOtp
                ? "Local dev mode: Resend email service is disabled. Use the toast above to view or auto-fill your code."
                : "Verification email is sent by the configured transactional email provider. No fallback code is generated in the UI."}
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-300">
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
                className="mt-0.5 h-4 w-4 accent-emerald-400"
              />
              <span>I confirm that I am 18 years of age or older.</span>
            </label>
            <p className="text-xs leading-5 text-zinc-500">
              FindMySensi records this age-policy attestation only. We do not
              ask for or store your date of birth.
            </p>
            <button
              disabled={loading}
              className="w-full rounded-lg bg-emerald-400 px-4 py-3 font-bold text-zinc-950 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-sm text-zinc-400">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-400 hover:underline"
          >
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
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-300"
      >
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
        className="w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-3 text-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      {help ? <p className="mt-1 text-xs text-zinc-400">{help}</p> : null}
    </div>
  );
}
