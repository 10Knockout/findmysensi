"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { SessionUser } from "@findmysensi/protocol";

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;
    new BrowserApiClient().getSession().then((session) => {
      if (!active) return;
      if (!session?.user) {
        router.replace("/login?next=/app");
        return;
      }
      setUser(session.user);
    });
    return () => {
      active = false;
    };
  }, [router]);

  const logout = async () => {
    await new BrowserApiClient().logout();
    router.replace("/login");
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-300 grid place-items-center">
        <p className="font-mono text-sm">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-black text-black text-xl">
              S
            </div>
            <div>
              <p className="text-xs text-zinc-400">Signed in as</p>
              <h1 className="text-xl font-bold text-white">
                {user.username ?? user.name ?? user.email}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app/settings"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={logout}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-red-300 hover:bg-zinc-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Practice Mode */}
        <section aria-labelledby="practice-title" className="mb-12">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Active Scenario
          </p>
          <h2
            id="practice-title"
            className="text-3xl font-black text-white mb-2"
          >
            Gridshot Practice
          </h2>
          <p className="max-w-2xl text-zinc-400 text-sm mb-6">
            128 Hz deterministic tick simulation. Preserves local scoring and
            session diagnostics.
          </p>
          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/80 p-6 shadow-xl">
            <div className="mb-6 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
              <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-xs block">
                  TARGET DENSITY
                </span>
                <span className="font-bold text-white font-mono">
                  3 Non-overlapping
                </span>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-xs block">DURATION</span>
                <span className="font-bold text-white font-mono">
                  60 Seconds
                </span>
              </div>
              <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-xs block">
                  SIMULATION KERNEL
                </span>
                <span className="font-bold text-white font-mono">
                  128 Hz Fixed Tick
                </span>
              </div>
            </div>
            <Link
              href="/app/train/grid"
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-6 py-3.5 text-base font-black text-zinc-950 hover:bg-emerald-300 sm:w-auto transition-colors"
            >
              Start Gridshot Session
            </Link>
          </div>
        </section>

        {/* Calibration & Sensitivity Toolkit */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Calibration & Tools
          </p>
          <h2 className="text-2xl font-bold text-white mb-6">
            Sensitivity & Crosshair Suite
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/tools/converter"
              className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/50 transition-all hover:bg-zinc-850"
            >
              <div className="text-xs font-mono text-emerald-400 uppercase mb-2">
                CONVERTER
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-2">
                Sensitivity Converter
              </h3>
              <p className="text-xs text-zinc-400">
                Exact 360° physical matching across CS2, Valorant, Overwatch 2,
                Apex, and Unreal.
              </p>
            </Link>

            <Link
              href="/tools/crosshair"
              className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-cyan-500/50 transition-all hover:bg-zinc-850"
            >
              <div className="text-xs font-mono text-cyan-400 uppercase mb-2">
                STUDIO
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                Crosshair Studio
              </h3>
              <p className="text-xs text-zinc-400">
                Design custom reticles, test live previews, and export compact
                share codes.
              </p>
            </Link>

            <Link
              href="/tools/sensi-lab"
              className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/50 transition-all hover:bg-zinc-850"
            >
              <div className="text-xs font-mono text-emerald-400 uppercase mb-2">
                BLIND LAB
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-2">
                Sensi Lab
              </h3>
              <p className="text-xs text-zinc-400">
                Subconscious binary search calibration tournament to find your
                true optimal sensitivity.
              </p>
            </Link>

            <Link
              href="/tools/mouse-swap"
              className="group p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-cyan-500/50 transition-all hover:bg-zinc-850"
            >
              <div className="text-xs font-mono text-cyan-400 uppercase mb-2">
                HARDWARE
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                Mouse Swap
              </h3>
              <p className="text-xs text-zinc-400">
                Preserve muscle memory when switching mouse sensors, models, or
                DPI steps.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
