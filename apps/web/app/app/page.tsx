"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
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
import styles from "./AccountFrame.module.css";

const TRAINING_MODES = [
  ["grid", "Grid Rush", "Three targets for fast flicks and rapid acquisition."],
  [
    "pinpoint",
    "Precision Six",
    "Six tiny targets for deliberate precision and route planning.",
  ],
  [
    "multi",
    "Multi Burst",
    "Targets grow and shrink away. Prioritise under pressure.",
  ],
  [
    "headline",
    "Headshot Lane",
    "Head-level targets strafing at three different depths.",
  ],
  [
    "strafe",
    "Strafe Track",
    "Stay glued to a target through unpredictable reversals. No clicking.",
  ],
  [
    "smooth-track",
    "Sphere Track",
    "Track a target moving all the way around you. No clicking.",
  ],
  [
    "microshot",
    "Micro Flick",
    "Tiny targets for fast, controlled corrections.",
  ],
  ["reaction", "Reflex Rush", "React to a target before it disappears."],
  [
    "switch-track",
    "Switch Track",
    "Four moving targets. Kill one, snap to the next.",
  ],
  [
    "anchor-flick",
    "Anchor Flick",
    "Return to the centre after every wide flick.",
  ],
  [
    "motion-flick",
    "Motion Flick",
    "Flick out and intercept a moving target with one shot.",
  ],
  ["turn180", "180 Flick", "Turn roughly all the way around and reacquire."],
  [
    "pathline",
    "Pathline",
    "Follow the corridor between targets. Scores stay on this device.",
  ],
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
  const [latestScores, setLatestScores] = useState<ReadonlyMap<string, number>>(
    () => new Map(),
  );

  useEffect(() => {
    // Local-only, per-device data from real practice history.
    const history = localPracticeHistory.getAll();
    setRecommendation(recommendNextExercise(history));
    setBenchmarks(computeSkillBenchmarks(history));
    const scores = new Map<string, number>();
    for (const run of history) {
      if (!scores.has(run.modeId)) scores.set(run.modeId, run.score);
    }
    setLatestScores(scores);
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
        <p className="app-help" role="status">
          Checking your session…
        </p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="app-page-inner">
        <header className={`app-page-header ${styles.dashboardHeader}`}>
          <div>
            <h1 className="app-section-title">Aim training</h1>
            <p className="app-section-copy">
              Signed in as {user.username ?? user.email}
            </p>
          </div>
          <div className="app-page-actions">
            <button
              onClick={() => setShowQuickSetup(true)}
              className="app-chip app-chip-acid"
            >
              Calibrate Aim
            </button>
            <Link href="/tools/mouse-swap" className="app-chip">
              Mouse Swap
            </Link>
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

        <section aria-labelledby="training-drills">
          <h2 id="training-drills" className="app-section-title">
            Drills
          </h2>
          <p className="app-section-copy">
            Train with {TRAINING_MODES.length} drills. Pathline scores stay on
            this device.
          </p>
          <div className={`app-mode-grid ${styles.modeGrid}`}>
            {TRAINING_MODES.map(([modeId, title, description]) => {
              const score = latestScores.get(modeId);
              return (
                <Link
                  key={modeId}
                  href={`/app/train/${modeId}`}
                  className="app-mode-card"
                >
                  <h3>{title}</h3>
                  <p>{description}</p>
                  {score !== undefined ? (
                    <p>
                      Latest on this device:{" "}
                      <strong>{score.toLocaleString()}</strong>
                    </p>
                  ) : null}
                  <span className={`app-mode-card-cta ${styles.modeLink}`}>
                    Play{" "}
                    <ArrowUpRight size={13} strokeWidth={1.7} aria-hidden />
                  </span>
                </Link>
              );
            })}
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
