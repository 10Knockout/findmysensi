import Link from "next/link";
import { LandingMotion } from "../src/features/landing/LandingMotion.js";
import { LandingOrb } from "../src/features/landing/LandingOrb.js";
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
    <main className="landing-shell">
      <LandingMotion />

      <header className="landing-nav">
        <Link href="#top" className="landing-wordmark">
          <span aria-hidden="true">F/</span> FindMySensi
        </Link>
        <nav aria-label="Main navigation" className="landing-nav-links">
          <a href="#training">Training</a>
          <a href="#calibration">Calibration</a>
          <a href="#leaderboard">Scores</a>
        </nav>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-login">
            Sign in
          </Link>
          <a href="#training" className="landing-pill landing-pill-light">
            Play free
          </a>
        </div>
      </header>

      <section id="top" className="landing-hero">
        <LandingOrb />
        <div className="landing-hero-scrim" aria-hidden="true" />
        <div className="landing-hero-content" data-reveal>
          <p className="landing-kicker">Browser aim trainer</p>
          <h1>
            Find your
            <br />
            <em>sensi.</em>
          </h1>
          <p className="landing-hero-copy">
            Focused aim drills, sensitivity conversion, and performance stats in
            your browser.
          </p>
          <div className="landing-hero-actions">
            <a href="#training" className="landing-pill landing-pill-acid">
              Play as guest
              <ArrowIcon />
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

      <section id="training" className="landing-chapter landing-chapter-light">
        <div className="landing-section-head" data-reveal>
          <h2>Choose your drill.</h2>
          <p>
            Practice flicks, tracking, reaction time, or steady movement along a
            path.
          </p>
        </div>

        <div className="landing-training-stage" data-reveal>
          <div
            className="landing-target-field"
            aria-label="Animated preview of a cursor snapping between aim targets"
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

        <div className="landing-guest-intro">
          <h3>Play as guest</h3>
          <p>
            Choose a drill with a desktop mouse or trackpad. Guest scores stay
            off the leaderboard.
          </p>
        </div>
        <div
          className="landing-mode-rail"
          aria-label="Available training modes"
        >
          {MODES.map((mode) => (
            <Link
              key={mode.modeId}
              href={`/play/${mode.modeId}`}
              prefetch={false}
            >
              <span>
                <small>{mode.scenarioEntry.presentation.category}</small>
                <strong>{mode.scenarioEntry.presentation.title}</strong>
              </span>
              <ArrowIcon />
            </Link>
          ))}
        </div>
      </section>

      <section
        id="calibration"
        className="landing-chapter landing-chapter-acid"
      >
        <div className="landing-calibration-copy" data-reveal>
          <h2>Find what feels right.</h2>
        </div>
        <div className="landing-calibration-detail" data-reveal>
          <p>
            Test several sensitivity values across five drills without seeing
            the active value. FindMySensi recommends a setting from your runs.
          </p>
          <div className="landing-number-line">
            <span>0.125 Valorant</span>
            <i />
            <span>43.54 cm/360 at 2400 DPI</span>
          </div>
          <Link href="/register" className="landing-pill landing-pill-dark">
            Find my sensi
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <section
        id="leaderboard"
        className="landing-chapter landing-chapter-dark"
      >
        <div className="landing-board-intro" data-reveal>
          <h2>See where you place.</h2>
          <p>
            Eligible signed-in runs count toward the public leaderboard for each
            drill. See your best score and position after your run syncs.
          </p>
        </div>
        <div className="landing-board-panel" data-reveal>
          <LiveLeaderboard modes={LEADERBOARD_MODES} />
        </div>
      </section>

      <section className="landing-chapter landing-chapter-tools">
        <div className="landing-tool-card" data-reveal>
          <h2>Sensitivity converter</h2>
          <p>
            Convert Valorant, CS2, Apex, or Aimlabs settings and adjust the
            match for your browser.
          </p>
          <Link href="/tools/converter" className="landing-arrow-link">
            Open converter <ArrowIcon />
          </Link>
        </div>
        <div
          className="landing-tool-card landing-tool-card-inverse"
          data-reveal
        >
          <h2>Open source trainer</h2>
          <p>
            The trainer, sensitivity math, scenarios, and scoring are public on
            GitHub under the MPL-2.0 licence. Built by Hitesh Mahay, improved
            with players.
          </p>
          <a
            href="https://github.com/10Knockout/findmysensi"
            target="_blank"
            rel="noreferrer"
            className="landing-arrow-link"
          >
            View source on GitHub <ArrowIcon />
          </a>
        </div>
      </section>

      <section
        className="landing-chapter landing-faq"
        aria-labelledby="faq-title"
      >
        <h2 id="faq-title">Frequently asked questions</h2>
        <div>
          <details>
            <summary>Can I train without an account?</summary>
            <p>
              Yes. Pick any drill above and play on a desktop browser with a
              mouse or trackpad. Sign in to save account results and join
              eligible leaderboards.
            </p>
          </details>
          <details>
            <summary>Why does my converted sensitivity feel different?</summary>
            <p>
              Browser mouse input can differ by device and browser. Use the
              converter’s browser calibration and compare the mouse distance for
              a full turn at the same DPI.
            </p>
          </details>
          <details>
            <summary>What does Pathline train?</summary>
            <p>
              Hit one target, follow the visible corridor, and hit the next.
              Your score rewards clean transfers along the path.
            </p>
          </details>
        </div>
      </section>

      <section className="landing-final-cta">
        <p>Mouse ready?</p>
        <h2>Make every count.</h2>
        <Link href="/register" className="landing-pill landing-pill-dark">
          Create free account
          <ArrowIcon />
        </Link>
      </section>

      <footer className="landing-footer">
        <span className="landing-wordmark">
          <span aria-hidden="true">F/</span> FindMySensi
        </span>
        <p>
          Precision over noise. Built for the browser.
          <br />
          <a href="https://findmysensi.com">findmysensi.com</a>
        </p>
        <div>
          <Link href="/guides">Guides</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a
            href="https://github.com/10Knockout/findmysensi/issues"
            target="_blank"
            rel="noreferrer"
          >
            Report an issue
          </a>
          <a href="https://hiteshmahay.com" target="_blank" rel="noreferrer">
            Hitesh Mahay
          </a>
          <a
            href="https://www.youtube.com/@KOgamerX"
            target="_blank"
            rel="noreferrer"
            aria-label="FindMySensi on YouTube"
            className="landing-footer-yt"
          >
            <YouTubeIcon />
          </a>
        </div>
      </footer>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}
