"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { TrainerSettings, TrainerSettingsSchema } from "@findmysensi/protocol";
import type { SessionUser } from "@findmysensi/protocol";
import { recommendNextExercise } from "@findmysensi/trainer-runtime";
import { localPracticeHistory } from "../../src/features/training/local-history.js";
import { QuickSetupModal } from "../../src/features/onboarding/QuickSetupModal.js";

const TRAINING_MODES = [
  ["grid", "Gridshot", "Three targets for fast flicks and rapid acquisition."],
  [
    "pinpoint",
    "Pinpoint",
    "Tiny targets for deliberate precision and planning.",
  ],
  ["multi", "Multi", "Six targets for route planning and target transitions."],
  [
    "headline",
    "Headline",
    "Horizontal targets for disciplined head-level aim.",
  ],
  ["strafe", "Strafe", "Moving targets with reversals and changing speeds."],
  ["smooth-track", "Smooth Track", "Continuous tracking along a smooth path."],
  [
    "tempo",
    "Tempo",
    "Rhythmic clicks judged as perfect, early, late, or miss.",
  ],
  ["microshot", "Microshot", "Tiny targets for fast, controlled corrections."],
  ["reaction", "Reaction", "Tick-timed visual reaction and acquisition."],
  ["switch-track", "Switch Track", "Acquire, hold, switch, and reacquire."],
] as const;

export default function AppDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [trainerSettings, setTrainerSettings] =
    useState<TrainerSettings | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<{
    modeId: string;
    reason: string;
  } | null>(null);

  useEffect(() => {
    // Local-only, per-device recommendation from real practice history.
    setRecommendation(recommendNextExercise(localPracticeHistory.getAll()));
  }, []);

  useEffect(() => {
    let active = true;
    const client = new BrowserApiClient();

    client
      .getSession()
      .then((session) => {
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?next=/app");
          return;
        }
        setUser(session.user);

        return client.getTrainerSettings();
      })
      .then((res) => {
        if (!active || !res) return;
        if (res.ok && res.data) {
          try {
            const parsed = TrainerSettingsSchema.parse(res.data);
            setTrainerSettings(parsed);
            if (parsed.fmsSensitivity === null) {
              setShowQuickSetup(true);
            }
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
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
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <p className="text-xs text-zinc-500">Signed in as</p>
            <h1 className="text-2xl font-black text-white">
              {user.username ?? user.email}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowQuickSetup(true)}
              className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-900/50 transition-colors"
            >
              Calibrate Aim
            </button>
            <Link
              href="/app/settings"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
            >
              Settings
            </Link>
            <button
              onClick={logout}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-red-300 hover:bg-zinc-900"
            >
              Sign out
            </button>
          </div>
        </header>

        {recommendation ? (
          <div className="mb-8 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
              Recommended next
            </p>
            <p className="mt-1 text-sm text-zinc-200">
              Train{" "}
              <Link
                href={`/app/train/${recommendation.modeId}`}
                className="font-bold text-cyan-300 underline hover:text-cyan-200"
              >
                {TRAINING_MODES.find(
                  ([id]) => id === recommendation.modeId,
                )?.[1] ?? recommendation.modeId}
              </Link>{" "}
              next. {recommendation.reason}
            </p>
          </div>
        ) : null}

        <section>
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Training
          </p>
          <h2 className="mb-2 text-3xl font-black text-white">Aim Training</h2>
          <p className="mb-6 text-sm text-zinc-500">
            Ten focused exercises. Results stay local until verified scoring is
            enabled.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRAINING_MODES.map(([modeId, title, description]) => (
              <Link
                key={modeId}
                href={`/app/train/${modeId}`}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-emerald-500/60 hover:bg-zinc-900/80"
              >
                <h3 className="font-black text-white group-hover:text-emerald-300">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-zinc-400">
                  {description}
                </p>
                <span className="mt-5 inline-block font-mono text-xs font-bold text-emerald-400">
                  PLAY →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {trainerSettings ? (
        <QuickSetupModal
          isOpen={showQuickSetup}
          onClose={() => setShowQuickSetup(false)}
          currentSettings={trainerSettings}
          onSaved={(updated) => setTrainerSettings(updated)}
        />
      ) : null}
    </main>
  );
}
