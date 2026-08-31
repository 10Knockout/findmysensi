"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { SessionUser } from "@findmysensi/protocol";

const SCENARIOS = [
  {
    id: "grid",
    title: "Gridshot",
    tag: "FLICK",
    description: "3 non-overlapping static targets with rapid replacement.",
    href: "/app/train/grid",
    color: "emerald",
  },
  {
    id: "pinpoint",
    title: "Pinpoint",
    tag: "PRECISION",
    description: "6 tiny stationary targets for precision planning.",
    href: "/app/train/grid?mode=pinpoint",
    color: "cyan",
  },
  {
    id: "multi",
    title: "Multi",
    tag: "SWITCHING",
    description: "Mixed large/medium/small targets with fast respawns.",
    href: "/app/train/grid?mode=multi",
    color: "emerald",
  },
  {
    id: "headline",
    title: "Headline",
    tag: "CORRIDOR",
    description: "Controlled head-height horizontal flick corridor.",
    href: "/app/train/grid?mode=headline",
    color: "cyan",
  },
  {
    id: "strafe",
    title: "Strafe",
    tag: "TRACKING",
    description: "Moving targets with linear and oscillating patterns.",
    href: "/app/train/grid?mode=strafe",
    color: "emerald",
  },
  {
    id: "smooth-track",
    title: "Smooth Track",
    tag: "BEAM",
    description: "Continuous Lissajous-path tracking with angular scoring.",
    href: "/app/train/grid?mode=smooth-track",
    color: "cyan",
  },
  {
    id: "tempo",
    title: "Tempo",
    tag: "RHYTHM",
    description: "120 BPM rhythmic click timing with precision windows.",
    href: "/app/train/grid?mode=tempo",
    color: "emerald",
  },
];

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
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-300">
        <p className="font-mono text-sm">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-xl font-black text-black">
              S
            </div>
            <div>
              <p className="text-xs text-zinc-400">Signed in as</p>
              <h1 className="text-xl font-bold text-white">
                {user.username ?? user.name ?? user.email}
              </h1>
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-zinc-800"
          >
            Sign out
          </button>
        </header>

        {/* Practice Modes */}
        <section aria-labelledby="practice-title" className="mb-12">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Training Suite
          </p>
          <h2
            id="practice-title"
            className="mb-6 text-3xl font-black text-white"
          >
            Practice Scenarios
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCENARIOS.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 transition-all hover:border-emerald-500/50 hover:bg-zinc-850"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {s.tag}
                  </span>
                  <span className="text-xs text-zinc-500">128 Hz</span>
                </div>
                <h3 className="mb-1 text-lg font-bold text-white transition-colors group-hover:text-emerald-300">
                  {s.title}
                </h3>
                <p className="text-xs text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Calibration & Sensitivity Toolkit */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
            Calibration & Tools
          </p>
          <h2 className="mb-6 text-2xl font-bold text-white">
            Sensitivity & Crosshair Suite
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/tools/converter"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-emerald-500/50 hover:bg-zinc-850"
            >
              <div className="mb-2 font-mono text-xs uppercase text-emerald-400">
                CONVERTER
              </div>
              <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-emerald-300">
                Sensitivity Converter
              </h3>
              <p className="text-xs text-zinc-400">
                Exact 360° physical matching across CS2, Valorant, Overwatch 2,
                Apex, and Unreal.
              </p>
            </Link>

            <Link
              href="/tools/crosshair"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-cyan-500/50 hover:bg-zinc-850"
            >
              <div className="mb-2 font-mono text-xs uppercase text-cyan-400">
                STUDIO
              </div>
              <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-cyan-300">
                Crosshair Studio
              </h3>
              <p className="text-xs text-zinc-400">
                Design custom reticles, test live previews, and export compact
                share codes.
              </p>
            </Link>

            <Link
              href="/tools/sensi-lab"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-emerald-500/50 hover:bg-zinc-850"
            >
              <div className="mb-2 font-mono text-xs uppercase text-emerald-400">
                BLIND LAB
              </div>
              <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-emerald-300">
                Sensi Lab
              </h3>
              <p className="text-xs text-zinc-400">
                Subconscious binary search calibration tournament to find your
                true optimal sensitivity.
              </p>
            </Link>

            <Link
              href="/tools/mouse-swap"
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-cyan-500/50 hover:bg-zinc-850"
            >
              <div className="mb-2 font-mono text-xs uppercase text-cyan-400">
                HARDWARE
              </div>
              <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-cyan-300">
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
