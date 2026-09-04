"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { SessionUser } from "@findmysensi/protocol";
import {
  ACHIEVEMENT_DEFINITIONS,
  AVATAR_OPTIONS,
  bestAccuracyFromHistory,
  frameForAccuracy,
  titleForAccuracy,
  type LifetimeStats,
} from "@findmysensi/trainer-runtime";
import { localPracticeHistory } from "../../../src/features/training/local-history.js";
import { localAchievements } from "../../../src/features/training/local-achievements.js";
import {
  getSelectedAvatarId,
  setSelectedAvatarId,
} from "../../../src/features/training/local-avatar.js";

const ZERO_LIFETIME: LifetimeStats = {
  totalSessions: 0,
  totalShots: 0,
  totalPracticeSeconds: 0,
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [avatarId, setAvatarId] = useState(AVATAR_OPTIONS[0]!.id);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [lifetime, setLifetime] = useState<LifetimeStats>(ZERO_LIFETIME);
  const [unlocked, setUnlocked] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let active = true;
    const client = new BrowserApiClient();
    client
      .getSession()
      .then((session) => {
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?next=/app/profile");
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

  useEffect(() => {
    // Local-only, per-device data from real practice history.
    const history = localPracticeHistory.getAll();
    const lifetimeStats = localPracticeHistory.getLifetimeStats();
    setBestAccuracy(bestAccuracyFromHistory(history));
    setLifetime(lifetimeStats);
    localAchievements.sync(history, lifetimeStats);
    setUnlocked(localAchievements.getUnlocked());
    setAvatarId(getSelectedAvatarId());
  }, []);

  const selectAvatar = (id: string) => {
    setSelectedAvatarId(id);
    setAvatarId(id);
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

  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === avatarId) ?? AVATAR_OPTIONS[0]!;
  const frame = frameForAccuracy(bestAccuracy);
  const title = titleForAccuracy(bestAccuracy);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/app"
          className="text-sm font-semibold text-emerald-400 hover:underline"
        >
          ← Trainer Home
        </Link>

        <header className="mt-4 mb-10 flex items-center gap-5 border-b border-zinc-800 pb-8">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-4xl"
            style={{
              backgroundColor: `${avatar.colorHex}22`,
              border: `3px solid ${frame.colorHex}`,
              color: avatar.colorHex,
            }}
          >
            {avatar.glyph}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">
              {user.username ?? user.email}
            </h1>
            <p
              className="mt-1 font-mono text-xs font-bold uppercase tracking-widest"
              style={{ color: frame.colorHex }}
            >
              {title}
            </p>
          </div>
        </header>

        <section className="mb-10">
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Avatar
          </p>
          <h2 className="mb-4 text-xl font-black text-white">
            Choose Your Look
          </h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => selectAvatar(option.id)}
                aria-pressed={option.id === avatarId}
                className={`grid aspect-square place-items-center rounded-xl border text-2xl transition-colors ${
                  option.id === avatarId
                    ? "border-emerald-500 bg-emerald-950/30"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                }`}
                style={{ color: option.colorHex }}
                title={option.label}
              >
                {option.glyph}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Sessions
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {lifetime.totalSessions}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Shots Fired
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {lifetime.totalShots}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Practice Time
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {Math.floor(lifetime.totalPracticeSeconds / 60)}m
            </p>
          </div>
        </section>

        <section>
          <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Achievements
          </p>
          <h2 className="mb-4 text-xl font-black text-white">
            {unlocked.size} / {ACHIEVEMENT_DEFINITIONS.length} Unlocked
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
              const isUnlocked = unlocked.has(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`rounded-xl border p-4 ${
                    isUnlocked
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-zinc-800 bg-zinc-900/60 opacity-60"
                  }`}
                >
                  <p
                    className={`font-black ${isUnlocked ? "text-emerald-300" : "text-zinc-400"}`}
                  >
                    {achievement.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {achievement.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
