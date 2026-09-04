"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { SessionUser } from "@findmysensi/protocol";
import { WORKOUT_DEFINITIONS } from "@findmysensi/trainer-runtime";

const MODE_TITLES: Record<string, string> = {
  grid: "Gridshot",
  pinpoint: "Pinpoint",
  multi: "Multi",
  headline: "Headline",
  strafe: "Strafe",
  "smooth-track": "Smooth Track",
  tempo: "Tempo",
  microshot: "Microshot",
  reaction: "Reaction",
  "switch-track": "Switch Track",
};

export default function WorkoutsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    new BrowserApiClient()
      .getSession()
      .then((session) => {
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?next=/app/workouts");
          return;
        }
        setUser(session.user);
      })
      .catch(() => {
        if (active) setError("Could not load your session.");
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
        <div
          role="alert"
          className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-200"
        >
          {error}
        </div>
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
      <div className="mx-auto max-w-4xl">
        <Link
          href="/app"
          className="text-sm font-semibold text-emerald-400 hover:underline"
        >
          ← Trainer Home
        </Link>
        <h1 className="mt-3 mb-2 text-3xl font-black text-white">Workouts</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Curated sequences from the 10 exercise catalog. Play each exercise in
          order; there is no auto-advance yet.
        </p>

        <div className="space-y-5">
          {WORKOUT_DEFINITIONS.map((workout) => (
            <div
              key={workout.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <h2 className="text-xl font-black text-white">{workout.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {workout.description}
              </p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {workout.modeIds.map((modeId, index) => (
                  <li key={`${workout.id}-${modeId}-${index}`}>
                    <Link
                      href={`/app/train/${modeId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:border-emerald-500/60 hover:text-emerald-300"
                    >
                      <span className="text-zinc-600">{index + 1}.</span>
                      {MODE_TITLES[modeId] ?? modeId}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
