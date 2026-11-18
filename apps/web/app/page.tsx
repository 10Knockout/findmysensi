import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Crosshair,
  SlidersHorizontal,
} from "lucide-react";
import { LandingHero } from "../src/features/landing/LandingHero.js";
import styles from "../src/features/landing/LandingHero.module.css";
import { LiveLeaderboard } from "../src/features/landing/LiveLeaderboard.js";
import { trainerModeManifest } from "../src/trainer/mode-manifest.js";

const MODES = Array.from(trainerModeManifest.values()).filter(
  (entry) => entry.enabled && entry.createAdapter,
);

const LEADERBOARD_MODES = MODES.filter((entry) => entry.leaderboardEnabled).map(
  (entry) => ({
    modeId: entry.modeId,
    title: entry.scenarioEntry.presentation.title,
    scenarioVersion: entry.scenarioEntry.definition.scenarioVersion,
    scoringVersion: entry.scenarioEntry.definition.scoringVersion,
  }),
);

export default function HomePage() {
  return (
    <main className={styles.home} id="main-content">
      <LandingHero />

      <section
        className={styles.chapter}
        id="training"
        aria-labelledby="drills-title"
      >
        <div className={styles.chapterHeading}>
          <div>
            <h2 id="drills-title">Choose your drill</h2>
            <p>
              Practice flicks, tracking, reaction time, and controlled movement.
            </p>
          </div>
          <div className={styles.guest} id="guest-play" tabIndex={-1}>
            <h3>Play as guest</h3>
            <p>Guest scores stay off the leaderboard.</p>
          </div>
        </div>
        <ul className={styles.drills}>
          {MODES.map((mode) => (
            <li key={mode.modeId}>
              <Link href={`/play/${mode.modeId}`} prefetch={false}>
                <span>
                  <strong>{mode.scenarioEntry.presentation.title}</strong>
                  <small>{mode.scenarioEntry.presentation.category}</small>
                </span>
                <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.65} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.chapter}
        id="calibration"
        aria-labelledby="tools-title"
      >
        <div className={styles.chapterHeading}>
          <div>
            <h2 id="tools-title">Sensitivity tools</h2>
            <p>
              Find a starting point, compare settings in drills, or carry a
              setting across games.
            </p>
          </div>
        </div>
        <div className={styles.toolList}>
          <Link href="/tools/calibrate">
            <Crosshair
              className={styles.toolIcon}
              size={22}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>
              <strong>Find my sensitivity</strong>
              <small>
                Compare settings across five drills in a blind test.
              </small>
            </span>
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.65} />
          </Link>
          <Link href="/tools/converter">
            <SlidersHorizontal
              className={styles.toolIcon}
              size={22}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>
              <strong>Sensitivity converter</strong>
              <small>Match hipfire sensitivity between supported games.</small>
            </span>
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.65} />
          </Link>
        </div>
      </section>

      <section
        className={styles.chapter}
        id="leaderboard"
        aria-labelledby="scores-title"
      >
        <div className={styles.chapterHeading}>
          <div>
            <h2 id="scores-title">Leaderboards</h2>
            <p>See how eligible signed-in runs compare in each drill.</p>
          </div>
        </div>
        <LiveLeaderboard modes={LEADERBOARD_MODES} />
      </section>

      <section
        className={`${styles.chapter} ${styles.questions}`}
        aria-labelledby="faq-title"
      >
        <h2 id="faq-title">Good to know</h2>
        <div>
          <details>
            <summary>Can I train without an account?</summary>
            <p>
              Yes. Pick a drill above and play with a desktop mouse or trackpad.
              Sign in to save account results and join eligible leaderboards.
            </p>
          </details>
          <details>
            <summary>Why does my converted sensitivity feel different?</summary>
            <p>
              Mouse input can differ by device and browser. Use the converter’s
              browser calibration and compare your full-turn distance at the
              same DPI.
            </p>
          </details>
          <details>
            <summary>What does Pathline train?</summary>
            <p>
              Follow the visible corridor from one target to the next. Leaving
              the corridor sends you back to the start of that path.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
