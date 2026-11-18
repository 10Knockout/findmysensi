"use client";

import { useEffect, useState } from "react";
import type { RuntimeScoreResult } from "@findmysensi/trainer-runtime";
import { BackLink } from "../components/BackLink.js";
import { TrainerBootstrap } from "./TrainerBootstrap.js";

export function GuestTrainer({ mode, title }: { mode: string; title: string }) {
  const [canPlay, setCanPlay] = useState<boolean | null>(null);
  const [result, setResult] = useState<RuntimeScoreResult | null>(null);

  useEffect(() => {
    const pointer = window.matchMedia("(any-pointer: fine)");
    const check = () =>
      setCanPlay(
        pointer.matches &&
          typeof document.documentElement.requestPointerLock === "function",
      );
    check();
    pointer.addEventListener("change", check);
    return () => pointer.removeEventListener("change", check);
  }, []);

  if (!canPlay) {
    return (
      <main className="app-shell">
        <section className="app-card">
          <h1 className="app-heading">{title}</h1>
          <p className="app-subtext">
            {canPlay === null
              ? "Checking browser controls…"
              : "This drill needs a desktop browser with mouse capture and a mouse or trackpad. Touch-only play is unavailable."}
          </p>
          <BackLink href="/#training" label="Choose another drill" />
        </section>
      </main>
    );
  }

  if (!result) {
    return <TrainerBootstrap mode={mode} guest onRunComplete={setResult} />;
  }

  const { metrics } = result;
  return (
    <main className="app-shell">
      <section className="app-card app-card-wide">
        <h1 className="app-heading">{title} results</h1>
        <p className="app-subtext">
          This guest result is visible here and stays off the leaderboard.
        </p>
        <dl
          className="trainer-hud"
          style={{ flexWrap: "wrap", margin: "24px 0" }}
        >
          <div>
            <dt>Score</dt>
            <dd>{result.score.toLocaleString()}</dd>
          </div>
          {"hits" in metrics ? (
            <>
              <div>
                <dt>Accuracy</dt>
                <dd>{metrics.accuracyPercentage}%</dd>
              </div>
              <div>
                <dt>Hits</dt>
                <dd>{metrics.hits}</dd>
              </div>
            </>
          ) : (
            <div>
              <dt>Time on target</dt>
              <dd>{metrics.onTargetPercentage}%</dd>
            </div>
          )}
          {"switchesCompleted" in metrics ? (
            <div>
              <dt>Switches</dt>
              <dd>{metrics.switchesCompleted}</dd>
            </div>
          ) : null}
          {"segmentsCompleted" in metrics ? (
            <>
              <div>
                <dt>Paths completed</dt>
                <dd>{metrics.segmentsCompleted}</dd>
              </div>
              <div>
                <dt>Clean paths</dt>
                <dd>{metrics.cleanSegments}</dd>
              </div>
            </>
          ) : null}
        </dl>
        <button
          className="app-button"
          type="button"
          onClick={() => setResult(null)}
        >
          Play again
        </button>
        <BackLink href="/#training" label="Choose another drill" />
      </section>
    </main>
  );
}
