"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { resolveSafeLoginDestination } from "../../src/features/auth/login-next.js";

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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-black text-black text-lg">
              S
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              FindMySensi
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign In
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Sign in to access Gridshot practice
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2"
            >
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
              className="w-full px-4 py-3 bg-black/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-emerald-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-black/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-emerald-400 hover:underline font-semibold"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
