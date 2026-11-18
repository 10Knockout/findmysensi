import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Crosshair,
  MousePointer2,
} from "lucide-react";
import { AimTrace } from "./AimTrace.js";
import styles from "./AimStation.module.css";

export function LandingHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.field} data-testid="hero-stage">
        <div className={styles.display} aria-hidden="true">
          <AimTrace />
        </div>
        <div className={styles.intro}>
          <h1 id="hero-title">
            Find your
            <br />
            sensitivity<span>.</span>
          </h1>
          <p>
            Calibrate your mouse, match settings across games, and train your
            aim in the browser.
          </p>
        </div>
        <div className={styles.signal} aria-hidden="true">
          <MousePointer2 size={14} /> Move to aim
        </div>
      </div>
      <div className={styles.controls}>
        <a href="#guest-play" className={styles.start}>
          <Crosshair size={19} aria-hidden="true" />
          Start training
          <ArrowDownRight size={18} aria-hidden="true" />
        </a>
        <Link href="/tools/calibrate" className={styles.control}>
          Find my sensitivity <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/tools/converter" className={styles.control}>
          Convert sensitivity <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
