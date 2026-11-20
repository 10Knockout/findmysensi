import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingNavigation } from "../src/features/landing/LandingNavigation.js";
import { LiveLeaderboard } from "../src/features/landing/LiveLeaderboard.js";
import styles from "../src/features/landing/LandingRestore.module.css";
import { AUTHOR_URL, GITHUB_URL } from "../src/lib/site.js";
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
    <div className="landing-shell">
      <LandingNavigation />
      <main id="main-content">
        <section
          id="top"
          className="landing-hero"
          data-testid="hero-stage"
          aria-labelledby="hero-title"
        >
          <Image
            src="/landing/aim-desk-hero.png"
            alt="A precision gaming mouse beside three aim targets on a dark monitor"
            fill
            fetchPriority="high"
            loading="eager"
            sizes="100vw"
            className="landing-hero-image"
          />
          <div className="landing-hero-scrim" aria-hidden="true" />
          <div className="landing-hero-content">
            <p className="landing-kicker">Browser aim trainer</p>
            <h1 id="hero-title">
              Find your
              <br />
              <em>sensi.</em>
            </h1>
            <p className="landing-hero-copy">
              Focused aim drills, sensitivity conversion, and performance stats
              in your browser.
            </p>
            <div className="landing-hero-actions">
              <a href="#guest-play" className="landing-pill landing-pill-acid">
                Start training <ArrowRight aria-hidden="true" />
              </a>
              <Link href="/tools/converter" className="landing-text-link">
                Convert sensitivity
              </Link>
            </div>
          </div>
          <div className="landing-hero-meta" aria-label="Product highlights">
            <span>{MODES.length} drills</span>
            <span>128 Hz simulation</span>
            <span>No download</span>
          </div>
          <a
            href="#training"
            className="landing-scroll-cue"
            aria-label="Scroll to training"
          >
            <span />
          </a>
        </section>

        <section
          id="training"
          className="landing-chapter landing-chapter-light"
          aria-labelledby="drills-title"
        >
          <div className="landing-section-head">
            <p className="landing-index">Training</p>
            <h2 id="drills-title">
              Less noise.
              <br />
              More signal.
            </h2>
            <p>
              Practice flicks, tracking, reaction time, or steady movement along
              a path.
            </p>
          </div>

          <div className="landing-training-stage">
            <div
              className="landing-target-field"
              aria-label="Preview of a flick drill with three targets and a crosshair"
              role="img"
            >
              <i className="target target-one" />
              <i className="target target-two" />
              <i className="target target-three" />
              <span className="landing-shot shot-one" aria-hidden="true" />
              <span className="landing-shot shot-two" aria-hidden="true" />
              <span className="landing-shot shot-three" aria-hidden="true" />
              <span className="landing-crosshair" aria-hidden="true" />
            </div>
            <div className="landing-stage-caption">
              <strong>Flick drill preview</strong>
            </div>
          </div>

          <div id="guest-play" className={styles.guest} tabIndex={-1}>
            <div className="landing-guest-intro">
              <h3>Play as guest</h3>
              <p>
                Choose a drill with a desktop mouse or trackpad. Guest scores
                stay off the leaderboard.
              </p>
            </div>
            <ul
              className={`landing-mode-rail ${styles.drills}`}
              aria-label="Available training modes"
            >
              {MODES.map((mode) => (
                <li key={mode.modeId}>
                  <Link href={`/play/${mode.modeId}`} prefetch={false}>
                    <span>
                      <strong>{mode.scenarioEntry.presentation.title}</strong>
                      <small>{mode.scenarioEntry.presentation.category}</small>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="calibration"
          className="landing-chapter landing-chapter-acid"
          aria-labelledby="calibration-title"
        >
          <div className="landing-calibration-copy">
            <p className="landing-index">Calibration</p>
            <h2 id="calibration-title">
              Stop guessing.
              <br />
              Test it.
            </h2>
          </div>
          <div className="landing-calibration-detail">
            <p>
              Convert your in-game setting or compare hidden sensitivity values
              in six drills to find a setting that suits you.
            </p>
            <div className="landing-number-line">
              <span>0.125 Valorant</span>
              <i />
              <span>43.54 cm/360 at 2400 DPI</span>
            </div>
            <Link
              href="/tools/calibrate"
              className="landing-pill landing-pill-dark"
            >
              Find my sensitivity <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          id="leaderboard"
          className="landing-chapter landing-chapter-dark"
          aria-labelledby="scores-title"
        >
          <div className="landing-board-intro">
            <p className="landing-index">Leaderboards</p>
            <h2 id="scores-title">
              Your progress,
              <br />
              without the fiction.
            </h2>
            <p>See how eligible signed-in runs compare in each drill.</p>
          </div>
          <div className={`landing-board-panel ${styles.boardPanel}`}>
            <LiveLeaderboard modes={LEADERBOARD_MODES} />
          </div>
        </section>

        <section className="landing-chapter landing-chapter-tools">
          <div className="landing-tool-card">
            <p className="landing-index">Sensitivity converter</p>
            <h2>Same aim. Different number.</h2>
            <p>
              Match hipfire sensitivity between supported games using angular
              gain, eDPI, and cm/360.
            </p>
            <Link href="/tools/converter" className="landing-arrow-link">
              Open converter <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="landing-tool-card landing-tool-card-inverse">
            <p className="landing-index">Open source</p>
            <h2>Inspect the engine.</h2>
            <p>
              The trainer, sensitivity math, scenarios, and scoring are public
              on GitHub under the MPL-2.0 license.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="landing-arrow-link"
            >
              View source on GitHub <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </section>

        <section
          className={`landing-chapter landing-chapter-light ${styles.questions}`}
          aria-labelledby="faq-title"
        >
          <h2 id="faq-title">Good to know</h2>
          <div>
            <details>
              <summary>Can I train without an account?</summary>
              <p>
                Yes. Pick a drill above and play with a desktop mouse or
                trackpad. Sign in to save account results and join eligible
                leaderboards.
              </p>
            </details>
            <details>
              <summary>
                Why does my converted sensitivity feel different?
              </summary>
              <p>
                Mouse input can differ by device and browser. Use the
                converter’s browser calibration and compare your full-turn
                distance at the same DPI.
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

        <section className="landing-final-cta">
          <h2>Make every count.</h2>
          <div className={styles.finalActions}>
            <a href="#guest-play" className="landing-pill landing-pill-dark">
              Play as guest <ArrowRight aria-hidden="true" />
            </a>
            <Link href="/register" className="landing-pill landing-pill-light">
              Create free account
            </Link>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Link href="/" className="landing-wordmark">
          <span aria-hidden="true">F/</span> FindMySensi
        </Link>
        <p>Precision over noise. Built for the browser.</p>
        <nav className={styles.footerLinks} aria-label="Footer navigation">
          <Link href="/guides">Guides</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer">
            Report an issue
          </a>
          <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
            Hitesh Mahay
          </a>
          <a
            href="https://www.youtube.com/@KOgamerX"
            target="_blank"
            rel="noreferrer"
            aria-label="FindMySensi on YouTube"
            className="landing-footer-yt"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
            </svg>
          </a>
        </nav>
      </footer>
    </div>
  );
}
