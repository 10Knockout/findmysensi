"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("success");
  }, [token]);

  return (
    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl text-center">
      <Link href="/" className="inline-flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-black text-black text-lg">
          S
        </div>
        <span className="text-xl font-bold tracking-tight text-white">
          FindMySensi
        </span>
      </Link>

      {status === "loading" && (
        <div>
          <h1 className="text-xl font-bold text-white mb-2">
            Verifying Email...
          </h1>
          <p className="text-sm text-zinc-400">
            Please wait while we confirm your email address.
          </p>
        </div>
      )}

      {status === "success" && (
        <div>
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 text-xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Email Verified</h1>
          <p className="text-sm text-zinc-400 mb-6">
            Your email has been verified. You can now access your trainer
            account.
          </p>
          <Link
            href="/app"
            className="inline-block w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-lg transition-colors"
          >
            Go to Trainer Hub
          </Link>
        </div>
      )}

      {status === "error" && (
        <div>
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4 text-xl">
            ✕
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Verification Failed
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            The verification link is invalid or has expired.
          </p>
          <Link
            href="/login"
            className="inline-block w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="text-zinc-500 font-mono text-xs">LOADING...</div>
        }
      >
        <VerifyContent />
      </Suspense>
    </main>
  );
}
