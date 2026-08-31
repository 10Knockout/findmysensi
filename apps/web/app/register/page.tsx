"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { RegisterRequestSchema } from "@findmysensi/protocol";

const USERNAME_HELP =
  "3-24 characters. Use letters, numbers, underscores, or hyphens only.";
const PASSWORD_HELP =
  "At least 8 characters with one uppercase letter, one lowercase letter, and one symbol.";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
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
    });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setError(
        firstIssue?.path[0] === "username"
          ? USERNAME_HELP
          : firstIssue?.path[0] === "email"
            ? "Enter a valid email address."
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

    setVerificationEmail(parsed.data.email.trim().toLowerCase());
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
      router.push("/login?verified=1");
      return;
    }
    setError(result.error ?? "Invalid or expired code.");
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
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
            <p className="text-center text-xs text-zinc-500">
              Verification email is sent by the configured transactional email
              provider. No fallback code is generated in the UI.
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
              pattern="[A-Za-z0-9_-]+"
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
