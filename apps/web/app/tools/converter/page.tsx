"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BackLink } from "../../../src/components/BackLink.js";
import {
  DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE,
  SENSITIVITY_PROFILES,
  applyBrowserInputCalibration,
  convertSensitivity,
  type VerifiedSensitivityProfileId,
} from "@findmysensi/sensitivity";

const PUBLIC_GAME_IDS = [
  "valorant",
  "cs2",
  "apex",
  "aimlab-default",
] as const satisfies readonly VerifiedSensitivityProfileId[];

export default function SensitivityConverterPage() {
  const [sourceGame, setSourceGame] =
    useState<VerifiedSensitivityProfileId>("valorant");
  const [sourceSensitivity, setSourceSensitivity] = useState("0.125");
  const [sourceDpi, setSourceDpi] = useState("800");

  const result = useMemo(() => {
    const sensitivity = Number(sourceSensitivity);
    const dpi = Number(sourceDpi);
    if (
      !Number.isFinite(sensitivity) ||
      sensitivity <= 0 ||
      !Number.isInteger(dpi) ||
      dpi <= 0
    ) {
      return null;
    }

    try {
      return convertSensitivity({
        sourceGame,
        targetGame: "aimlab-default",
        sourceSensitivity: sensitivity,
        sourceDpi: dpi,
        targetDpi: dpi,
      });
    } catch {
      return null;
    }
  }, [sourceDpi, sourceGame, sourceSensitivity]);

  const canonicalSensitivity = result
    ? Number(result.formattedTargetSensitivity)
    : null;
  const calibratedSensitivity =
    canonicalSensitivity !== null && Number.isFinite(canonicalSensitivity)
      ? applyBrowserInputCalibration(canonicalSensitivity)
      : null;

  return (
    <main className="app-page">
      <div className="app-page-inner converter-tool">
        <header className="app-page-header converter-header">
          <div>
            <BackLink href="/app" label="Back to trainer home" />
            <p className="app-kicker">Sensitivity tools</p>
            <h1 className="app-section-title">Match your sensitivity</h1>
            <p className="app-subtext">
              Switched mouse or DPI?{" "}
              <Link href="/tools/mouse-swap" className="app-link">
                Mouse Swap →
              </Link>
            </p>
          </div>
          <div className="converter-badge">HIPFIRE • SAME DPI</div>
        </header>

        <p className="app-help converter-intro">
          Trainer has one Aim Sensitivity. Game choices below only convert your
          existing setting into that value. FOV changes view, never mouse
          rotation.
        </p>

        <div className="converter-layout">
          <ConverterPanel title="Your current game">
            <Field label="Game">
              <select
                value={sourceGame}
                onChange={(event) =>
                  setSourceGame(
                    event.target.value as VerifiedSensitivityProfileId,
                  )
                }
                className="app-input"
              >
                {PUBLIC_GAME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SENSITIVITY_PROFILES[id].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sensitivity">
              <input
                value={sourceSensitivity}
                onChange={(event) => setSourceSensitivity(event.target.value)}
                type="number"
                min="0.001"
                step="0.001"
                inputMode="decimal"
                className="app-input"
              />
            </Field>
            <Field label="DPI / CPI">
              <input
                value={sourceDpi}
                onChange={(event) => setSourceDpi(event.target.value)}
                type="number"
                min="1"
                step="1"
                className="app-input"
              />
            </Field>
          </ConverterPanel>

          <section
            aria-live="polite"
            className="app-card converter-panel converter-result"
          >
            <p className="settings-label">Your Aim Sensitivity</p>
            <div
              data-testid="fms-sensitivity-result"
              className="converter-value"
            >
              {calibratedSensitivity !== null
                ? formatSensitivity(calibratedSensitivity)
                : "—"}
            </div>
            {canonicalSensitivity !== null ? (
              <div
                data-testid="fms-sensitivity-canonical"
                className="app-help converter-canonical"
              >
                cm/360 match {formatSensitivity(canonicalSensitivity)} ×{" "}
                {DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE} browser calibration
              </div>
            ) : null}
            <p className="app-help converter-explanation">
              Enter this number once in FindMySensi. Every training game uses
              it. It includes the current browser calibration estimate. Measure
              a physical turn to verify the match on your device. No source-game
              profile stays active during training.
            </p>
            <div className="converter-presets">
              <p className="settings-label">Quick starting values</p>
              <div className="converter-preset-buttons">
                <button
                  type="button"
                  className="settings-chip"
                  onClick={() => {
                    setSourceGame("valorant");
                    setSourceSensitivity("0.125");
                  }}
                >
                  Valorant 0.125
                </button>
                <button
                  type="button"
                  className="settings-chip"
                  onClick={() => {
                    setSourceGame("cs2");
                    setSourceSensitivity("0.398");
                  }}
                >
                  CS2 0.398
                </button>
              </div>
              <p className="app-help">
                CS2 0.398 is the rounded equivalent of Valorant 0.125 at the
                same DPI.
              </p>
            </div>
          </section>
        </div>

        {result ? (
          <section className="app-card converter-panel converter-metrics">
            <div className="converter-metric-grid">
              <Metric
                label="cm / 360"
                value={`${result.formattedCmPer360} cm`}
              />
              <Metric
                label="in / 360"
                value={`${result.formattedInPer360} in`}
              />
              <Metric
                label="counts / 360"
                value={result.countsPer360.toFixed(2)}
              />
              <Metric
                label={`${SENSITIVITY_PROFILES[sourceGame].name} eDPI`}
                value={result.sourceEdpi.toFixed(2)}
              />
            </div>

            <p className="app-help converter-explanation">
              Same-DPI conversion preserves physical cm/360. eDPI is only
              meaningful inside its source game. ADS and scoped sensitivity are
              separate systems.
            </p>
          </section>
        ) : (
          <div role="alert" className="app-alert">
            Enter positive sensitivity and DPI values.
          </div>
        )}
      </div>
    </main>
  );
}

function ConverterPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-card converter-panel converter-inputs">
      <h2 className="app-heading">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="app-field">
      <span className="settings-label">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="converter-metric">
      <div className="settings-label">{label}</div>
      <div className="converter-metric-value">{value}</div>
    </div>
  );
}

function formatSensitivity(value: number): string {
  return Number(value.toFixed(6)).toString();
}
