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
      <div className="app-page-inner" style={{ maxWidth: 780 }}>
        <Link href="/app" className="app-link" style={{ fontSize: 13 }}>
          ← Trainer Home
        </Link>
        <h1
          className="app-section-title"
          style={{ marginTop: 14, marginBottom: 8 }}
        >
          Workouts
        </h1>
        <p className="app-section-copy">
          Curated sequences from the 10 exercise catalog. Play each exercise
          in order; there is no auto-advance yet.
        </p>

        {WORKOUT_DEFINITIONS.map((workout) => (
          <div key={workout.id} className="app-workout-card">
            <h2>{workout.title}</h2>
            <p>{workout.description}</p>
            <ol className="app-workout-steps">
              {workout.modeIds.map((modeId, index) => (
                <li key={`${workout.id}-${modeId}-${index}`}>
                  <Link
                    href={`/app/train/${modeId}`}
                    className="app-workout-step"
                  >
                    <b>{index + 1}.</b>
                    {MODE_TITLES[modeId] ?? modeId}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </main>
  );
}
