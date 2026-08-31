"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { SessionUser } from "@findmysensi/protocol";

export default function AppDashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = new BrowserApiClient();
    client.getSession().then((session) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    const client = new BrowserApiClient();
    await client.logout();
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center pb-6 border-b border-zinc-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-black text-black text-xl">
              S
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">
                FindMySensi
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                TRAINER DASHBOARD v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="text-xs text-zinc-500 font-mono">
                LOADING SESSION...
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-300 font-mono">
                  {user.email}
                </span>
                <Link
                  href="/app/settings"
                  className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded bg-red-950/60 border border-red-800/40 text-red-300 hover:bg-red-900 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-xs px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs px-4 py-2 rounded bg-emerald-400 hover:bg-emerald-300 text-black font-bold transition-colors"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Mode Selector */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Select Training Scenario
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Deterministic, input-accurate aim calibration and practice
              modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Grid Mode Card */}
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between hover:border-emerald-400/60 transition-all group">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                ACTIVE V1
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  Grid (Flicking)
                </h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  3 dynamic targets with instant deterministic replacement.
                  Evaluates precision, flick speed, and acquire consistency over
                  60 seconds.
                </p>

                <div className="space-y-2 mb-6 text-xs text-zinc-400 font-mono">
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span>Target Count:</span>
                    <span className="text-zinc-200">3 Simultaneous</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span>Target Radius:</span>
                    <span className="text-zinc-200">50,000 AngleUnits</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800 pb-1">
                    <span>Cadence:</span>
                    <span className="text-zinc-200">128 Hz Fixed Tick</span>
                  </div>
                </div>
              </div>

              <Link
                href="/train/grid"
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-lg text-center transition-colors shadow-lg shadow-emerald-950/50 block"
              >
                Launch Grid Practice
              </Link>
            </div>

            {/* Sensi Lab Card (Future / Scaffolding) */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-zinc-300">
                  Sensi Lab (Blind)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                  CALIBRATION
                </span>
              </div>
              <p className="text-sm text-zinc-500 mb-6">
                Blind A/B sensitivity comparison engine. Finds your true
                physical sensitivity through counterbalanced objective tests.
              </p>
              <button
                disabled
                className="w-full py-3 bg-zinc-800 text-zinc-500 font-medium rounded-lg text-center cursor-not-allowed text-sm"
              >
                Phase E Candidate
              </button>
            </div>

            {/* Mouse Swap Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-zinc-300">Mouse Swap</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                  DPI CONVERTER
                </span>
              </div>
              <p className="text-sm text-zinc-500 mb-6">
                Exact mathematical yaw transfer and DPI compensation between
                hardware sensors and different mice.
              </p>
              <button
                disabled
                className="w-full py-3 bg-zinc-800 text-zinc-500 font-medium rounded-lg text-center cursor-not-allowed text-sm"
              >
                Phase E Candidate
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
