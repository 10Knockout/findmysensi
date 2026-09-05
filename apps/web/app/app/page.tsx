"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import { TrainerSettings, TrainerSettingsSchema } from "@findmysensi/protocol";
import type { SessionUser } from "@findmysensi/protocol";
import {
  computeSkillBenchmarks,
  recommendNextExercise,
  type SkillBenchmarks,
} from "@findmysensi/trainer-runtime";
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
  const [benchmarks, setBenchmarks] = useState<SkillBenchmarks | null>(null);

  useEffect(() => {
    // Local-only, per-device data from real practice history.
    const history = localPracticeHistory.getAll();
    setRecommendation(recommendNextExercise(history));
    setBenchmarks(computeSkillBenchmarks(history));
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
      <main className="app-shell">
        <div role="alert" className="app-alert" style={{ margin: 0 }}>
          {error}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell">
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Checking your session…
        </p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="app-page-inner">
        <header className="app-page-header">
          <div>
            <p className="app-kicker" style={{ marginBottom: 4 }}>
              Signed in as
            </p>
            <h1 className="app-section-title" style={{ marginBottom: 0 }}>
              {user.username ?? user.email}
            </h1>
          </div>
          <div className="app-page-actions">
            <button
              onClick={() => setShowQuickSetup(true)}
              className="app-chip"
            >
              Calibrate Aim
            </button>
            <Link href="/app/calibrate" className="app-chip app-chip-acid">
              Find My Sensi
            </Link>
            <Link href="/app/sensi-battle" className="app-chip">
              Sensi Battle
            </Link>
            <Link href="/app/workouts" className="app-chip">
              Workouts
            </Link>
            <Link href="/app/profile" className="app-chip">
              Profile
            </Link>
            <Link href="/app/settings" className="app-chip">
              Settings
            </Link>
            <button onClick={logout} className="app-chip">
              Sign out
            </button>
          </div>
        </header>

        {recommendation ? (
          <div className="app-callout">
            <b>Recommended next</b>
            <p>
              Train{" "}
              <Link
                href={`/app/train/${recommendation.modeId}`}
                className="app-link"
              >
                {TRAINING_MODES.find(
                  ([id]) => id === recommendation.modeId,
                )?.[1] ?? recommendation.modeId}
              </Link>{" "}
              next. {recommendation.reason}
            </p>
          </div>
        ) : null}

        {benchmarks &&
        Object.values(benchmarks).some((entry) => entry !== null) ? (
          <div className="app-stat-grid">
            {(
              Object.entries(benchmarks) as [
                string,
                (typeof benchmarks)[keyof typeof benchmarks],
              ][]
            ).map(([category, entry]) =>
              entry ? (
                <div key={category} className="app-stat-card">
                  <b>{category}</b>
                  <strong>{entry.rank.name}</strong>
                  <span>
                    {entry.averageAccuracyPercentage.toFixed(1)}% accuracy
                  </span>
                </div>
              ) : null,
            )}
          </div>
        ) : null}

        <section>
          <p className="app-section-label">Training</p>
          <h2 className="app-section-title">Aim Training</h2>
          <p className="app-section-copy">
            Ten focused exercises. Results stay local until verified scoring
            is enabled.
          </p>
          <div className="app-mode-grid">
            {TRAINING_MODES.map(([modeId, title, description]) => (
              <Link
                key={modeId}
                href={`/app/train/${modeId}`}
                className="app-mode-card"
              >
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="app-mode-card-cta">PLAY →</span>
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
