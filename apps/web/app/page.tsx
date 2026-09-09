import Image from "next/image";
import Link from "next/link";
import { LandingMotion } from "../src/features/landing/LandingMotion.js";
import { LiveLeaderboard } from "../src/features/landing/LiveLeaderboard.js";
import { trainerModeManifest } from "../src/trainer/mode-manifest.js";

const MODES = [
  "Grid Rush",
  "Multi Burst",
  "Precision Six",
  "Anchor Flick",
  "Micro Flick",
  "Motion Flick",
  "Reflex Rush",
  "Strafe Track",
  "Sphere Track",
  "Switch Track",
  "Headshot Lane",
  "180 Flick",
] as const;

const LEADERBOARD_MODES = Array.from(trainerModeManifest.values())
  .filter((entry) => entry.enabled)
  .map((entry) => ({
    modeId: entry.modeId,
    title: entry.scenarioEntry.presentation.title,
    scenarioVersion: entry.scenarioEntry.definition.scenarioVersion,
    scoringVersion: entry.scenarioEntry.definition.scoringVersion,
  }));

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
          <Link href="/register" className="landing-pill landing-pill-light">
            Play free
          </Link>
        </div>
      </header>

      <section id="top" className="landing-hero">
        <Image
          src="/landing/aim-desk-hero.png"
          alt="A precision gaming mouse beside three aim targets on a dark monitor"
          fill
          priority
          fetchPriority="high"
          quality={78}
          sizes="100vw"
          className="landing-hero-image"
        />
        <div className="landing-hero-scrim" aria-hidden="true" />
        <div className="landing-hero-content" data-reveal>
          <p className="landing-kicker">
            Aim training, stripped to the signal.
          </p>
          <h1>
            Find your
            <br />
            <em>sensi.</em>
          </h1>
          <p className="landing-hero-copy">
            Twelve focused drills. Physical sensitivity conversion. Real
            performance data—inside your browser.
          </p>
          <div className="landing-hero-actions">
            <Link href="/register" className="landing-pill landing-pill-acid">
              Start training
              <ArrowIcon />
            </Link>
            <Link href="/tools/converter" className="landing-text-link">
              Convert sensitivity
            </Link>
          </div>
        </div>
        <div className="landing-hero-meta" aria-label="Product highlights">
          <span>12 drills</span>
          <span>128 Hz simulation</span>
          <span>0 installs</span>
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
          <p className="landing-index">01 / TRAIN</p>
          <h2>
            Less noise.
            <br />
            More signal.
          </h2>
          <p>
            Every drill isolates a useful aiming skill. No marketplace, no
            filler, no setup ritual.
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
            <span className="landing-demo-hud" aria-hidden="true">
              <b>GRID//01</b>
              <i>+300</i>
              <em>00:12.84</em>
            </span>
          </div>
          <div className="landing-stage-caption">
            <span>INPUT FEED / LIVE</span>
            <strong>See the shot. Feel the response.</strong>
          </div>
        </div>

        <div
          className="landing-mode-rail"
          aria-label="Available training modes"
        >
          {MODES.map((mode, index) => (
            <span key={mode}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              {mode}
            </span>
          ))}
        </div>
      </section>

      <section
        id="calibration"
        className="landing-chapter landing-chapter-acid"
      >
        <div className="landing-calibration-copy" data-reveal>
          <p className="landing-index">02 / CALIBRATE</p>
          <h2>
            Stop guessing.
            <br />
            Test it.
          </h2>
        </div>
        <div className="landing-calibration-detail" data-reveal>
          <p>
            Find My Sensi runs blinded, counterbalanced Gridshot blocks and
            recommends only a sensitivity you actually tested.
          </p>
          <div className="landing-number-line">
            <span>0.175</span>
            <i />
            <span>43.54 cm/360</span>
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
          <p className="landing-index">03 / MEASURE</p>
          <h2>
            Your progress,
            <br />
            without the fiction.
          </h2>
          <p>
            Every synced run lands on a public per-mode board. Your best score
            shows your rank the moment it saves.
          </p>
        </div>
        <div className="landing-board-panel" data-reveal>
          <LiveLeaderboard modes={LEADERBOARD_MODES} />
        </div>
      </section>

      <section className="landing-chapter landing-chapter-tools">
        <div className="landing-tool-card" data-reveal>
          <p className="landing-index">FREE TOOL / 01</p>
          <h2>Same aim. Different number.</h2>
          <p>
            Convert supported games using angular gain, eDPI, and cm/360—not
            folklore from a forum post.
          </p>
          <Link href="/tools/converter" className="landing-arrow-link">
            Open converter <ArrowIcon />
          </Link>
        </div>
        <div
          className="landing-tool-card landing-tool-card-inverse"
          data-reveal
        >
          <p className="landing-index">OPEN SOURCE / 02</p>
          <h2>Inspect the engine.</h2>
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
        <p>Precision over noise. Built for the browser.</p>
        <div>
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
