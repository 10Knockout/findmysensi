"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BackLink } from "../../../src/components/BackLink.js";
import {
  setBrowserCalibrationScale,
  useBrowserCalibrationScale,
} from "../../../src/lib/browser-calibration.js";
import {
  DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE,
  FMS_NATIVE_PROFILE_ID,
  MAX_BROWSER_INPUT_CALIBRATION_SCALE,
  MIN_BROWSER_INPUT_CALIBRATION_SCALE,
  SENSITIVITY_PROFILES,
  applyBrowserInputCalibration,
  convertSensitivity,
  runtimeFmsToGameSensitivity,
  type VerifiedSensitivityProfileId,
} from "@findmysensi/sensitivity";

const PUBLIC_GAME_IDS = [
  "valorant",
  "cs2",
  "apex",
  "aimlab-default",
] as const satisfies readonly VerifiedSensitivityProfileId[];

const BROWSER_PROFILE = "findmysensi";
type ConverterProfile = VerifiedSensitivityProfileId | typeof BROWSER_PROFILE;

const PROFILES = [BROWSER_PROFILE, ...PUBLIC_GAME_IDS] as const;

function profileName(profile: ConverterProfile): string {
  return profile === BROWSER_PROFILE
    ? "FindMySensi"
    : SENSITIVITY_PROFILES[profile].name;
}

export default function SensitivityConverterPage() {
  const [sourceGame, setSourceGame] = useState<ConverterProfile>("valorant");
  const [targetGame, setTargetGame] =
    useState<ConverterProfile>(BROWSER_PROFILE);
  const [sourceSensitivity, setSourceSensitivity] = useState("0.125");
  const [sourceDpi, setSourceDpi] = useState("800");
  const [matchedSensitivity, setMatchedSensitivity] = useState("");
  const [calibrationMessage, setCalibrationMessage] = useState("");
  const savedScale = useBrowserCalibrationScale();
  const calibrationScale =
    savedScale ?? DEFAULT_BROWSER_INPUT_CALIBRATION_SCALE;
  const toBrowser = targetGame === BROWSER_PROFILE;

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
      if (sourceGame === BROWSER_PROFILE) {
        if (targetGame === BROWSER_PROFILE || sensitivity > 100) return null;
        return runtimeFmsToGameSensitivity(
          targetGame,
          sensitivity,
          dpi,
          calibrationScale,
        ).conversion;
      }
      return convertSensitivity({
        sourceGame,
        targetGame:
          targetGame === BROWSER_PROFILE ? FMS_NATIVE_PROFILE_ID : targetGame,
        sourceSensitivity: sensitivity,
        sourceDpi: dpi,
        targetDpi: dpi,
      });
    } catch {
      return null;
    }
  }, [calibrationScale, sourceDpi, sourceGame, sourceSensitivity, targetGame]);

  const canonicalSensitivity = toBrowser
    ? (result?.targetSensitivity ?? null)
    : null;
  const outputSensitivity =
    result === null
      ? null
      : toBrowser
        ? applyBrowserInputCalibration(
            result.targetSensitivity,
            calibrationScale,
          )
        : result.targetSensitivity;

  function saveBrowserMatch() {
    const match = Number(matchedSensitivity);
    if (
      !canonicalSensitivity ||
      !Number.isFinite(match) ||
      match <= 0 ||
      match > 100
    ) {
      setCalibrationMessage(
        "Enter a valid FindMySensi sensitivity from above zero to 100.",
      );
      return;
    }
    const scale = match / canonicalSensitivity;
    if (
      scale < MIN_BROWSER_INPUT_CALIBRATION_SCALE ||
      scale > MAX_BROWSER_INPUT_CALIBRATION_SCALE
    ) {
      setCalibrationMessage(
        "That match is outside the supported range. Check both sensitivity values.",
      );
      return;
    }
    setBrowserCalibrationScale(scale);
    setCalibrationMessage("Browser match applied to conversion estimates.");
  }

  return (
    <main className="app-page">
      <div className="app-page-inner converter-tool">
        <header className="app-page-header converter-header">
          <div>
            <BackLink href="/" label="Back to home" />
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
          Convert hipfire sensitivity between games and FindMySensi for free.
          Conversions preserve the distance to turn 360° at the same DPI.
        </p>

        <div className="converter-layout">
          <ConverterPanel title="Convert sensitivity">
            <Field label="Game">
              <select
                value={sourceGame}
                onChange={(event) => {
                  const nextSource = event.target.value as ConverterProfile;
                  setSourceGame(nextSource);
                  if (nextSource === BROWSER_PROFILE && toBrowser)
                    setTargetGame("valorant");
                  setCalibrationMessage("");
                }}
                className="app-input"
              >
                {PROFILES.map((id) => (
                  <option key={id} value={id}>
                    {profileName(id)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Convert to">
              <select
                value={targetGame}
                onChange={(event) => {
                  setTargetGame(event.target.value as ConverterProfile);
                  setCalibrationMessage("");
                }}
                className="app-input"
              >
                {PROFILES.map((id) => (
                  <option
                    key={id}
                    value={id}
                    disabled={
                      id === BROWSER_PROFILE && sourceGame === BROWSER_PROFILE
                    }
                  >
                    {profileName(id)}
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
            <p className="settings-label">
              {toBrowser
                ? "Your Aim Sensitivity"
                : `${profileName(targetGame)} sensitivity`}
            </p>
            <div
              data-testid="fms-sensitivity-result"
              className="converter-value"
            >
              {outputSensitivity !== null
                ? formatSensitivity(outputSensitivity)
                : "—"}
            </div>
            {canonicalSensitivity !== null ? (
              <div
                data-testid="fms-sensitivity-canonical"
                className="app-help converter-canonical"
              >
                cm/360 match {formatSensitivity(canonicalSensitivity)} ×{" "}
                {formatSensitivity(calibrationScale)}{" "}
                {savedScale === null
                  ? "estimated browser multiplier"
                  : "personal browser multiplier"}
              </div>
            ) : null}
            <p className="app-help converter-explanation">
              {toBrowser
                ? "Enter this number once in FindMySensi. Every training game uses it. Compare a full turn at the same DPI in both games to check the estimate on your device."
                : sourceGame === BROWSER_PROFILE
                  ? `Uses your ${savedScale === null ? "estimated" : "personal"} browser multiplier of ${formatSensitivity(calibrationScale)}. Compare a full turn to check the estimate on your device.`
                  : "Use this value for hipfire at the same mouse DPI."}
            </p>
            {toBrowser && (
              <details>
                <summary>Calibrate to this browser</summary>
                <p className="app-help">
                  Enter the FindMySensi value that matches the game and
                  sensitivity above. Try a full turn in both games using the
                  same mouse and DPI. This adjustment applies to conversions in
                  this browser.
                </p>
                <Field label="Matching FindMySensi sensitivity">
                  <input
                    value={matchedSensitivity}
                    onChange={(event) => {
                      setMatchedSensitivity(event.target.value);
                      setCalibrationMessage("");
                    }}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="any"
                    className="app-input"
                  />
                </Field>
                <div className="converter-preset-buttons">
                  <button
                    type="button"
                    className="settings-chip"
                    onClick={saveBrowserMatch}
                    disabled={!outputSensitivity}
                  >
                    Use this match
                  </button>
                  {savedScale !== null && (
                    <button
                      type="button"
                      className="settings-chip"
                      onClick={() => {
                        setBrowserCalibrationScale(null);
                        setCalibrationMessage(
                          "Default browser estimate restored.",
                        );
                      }}
                    >
                      Restore default
                    </button>
                  )}
                </div>
                <p className="app-help" role="status">
                  {calibrationMessage}
                </p>
              </details>
            )}
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
              <Link href="/tools/calibrate" className="app-link">
                Find your sensitivity with aim drills
              </Link>
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
                label={`${profileName(sourceGame === BROWSER_PROFILE ? targetGame : sourceGame)} eDPI`}
                value={(sourceGame === BROWSER_PROFILE
                  ? result.targetEdpi
                  : result.sourceEdpi
                ).toFixed(2)}
              />
            </div>

            <p className="app-help converter-explanation">
              eDPI is specific to the named game. ADS and scoped sensitivity use
              separate settings.
            </p>
          </section>
        ) : (
          <div role="alert" className="app-alert">
            Enter a valid sensitivity and positive DPI for the selected game.
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
