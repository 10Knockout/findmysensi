"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { SessionUser } from "@findmysensi/protocol";

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    new BrowserApiClient().getSession().then((session) => {
      if (!active) return;
      if (!session?.user) {
        router.replace("/login?next=/app");
        return;
      }
      setUser(session.user);
    }).catch(() => {
      if (active) setError("Could not load your session.");
    });
    return () => {
      active = false;
    };
  }, [router]);

  const logout = async () => {
    await new BrowserApiClient().logout();
    router.replace("/login");
  };

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
        <div role="alert" className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-200">{error}</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-300">
        <p className="font-mono text-sm">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <p className="text-xs text-zinc-500">Signed in as</p>
            <h1 className="text-2xl font-black text-white">{user.username ?? user.email}</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/app/settings" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900">Settings</Link>
            <button onClick={logout} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-red-300 hover:bg-zinc-900">Sign out</button>
          </div>
        </header>

        <section>
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">Training</p>
          <h2 className="mb-6 text-3xl font-black text-white">Gridshot</h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="text-2xl font-black text-white">Gridshot</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Three circular targets. Fast flicks, rapid target acquisition and accurate clicks. This is the only exposed mode while the first game loop is being perfected.
                </p>
                <p className="mt-3 text-xs text-zinc-500">
                  Each training mode has its own leaderboard. There is no separate Practice/Ranked selector.
                </p>
              </div>
              <Link href="/app/train/grid" className="rounded-xl bg-emerald-400 px-8 py-4 text-center font-black text-zinc-950 hover:bg-emerald-300">
                PLAY GRIDSHOT
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
