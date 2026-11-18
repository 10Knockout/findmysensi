"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  TrainerSettingsSchema,
  type TrainerSettings,
} from "@findmysensi/protocol";
import type { RuntimeScoreResult } from "@findmysensi/trainer-runtime";
import {
  SENSITIVITY_PROFILES,
  applyBrowserInputCalibration,
  gameSensitivityToFms,
  runtimeFmsToGameSensitivity,
  type VerifiedSensitivityProfileId,
} from "@findmysensi/sensitivity";
import { BackLink } from "../../components/BackLink.js";
import { SensitivityGamePicker } from "../../components/SensitivityGamePicker.js";
import { useBrowserCalibrationScale } from "../../lib/browser-calibration.js";
import {
  loadGuestTrainerSettings,
  saveGuestTrainerSettings,
} from "../../trainer/guest-settings.js";
import { TrainerBootstrap } from "../../trainer/TrainerBootstrap.js";
import { generateRunSeed } from "../training/seed.js";
import {
  ACTIVE_SECONDS,
  COMPARISONS,
  COUNTDOWN_SECONDS,
  STRAFE_TARGET_PERCENT,
  TRIAL_SECONDS,
  buildPair,
  comparePair,
  formatSensitivity,
  isBrowserSensitivity,
  parseSensitivityInput,
  recordTrial,
  type CalibrationPair,
  type PairOutcome,
} from "./adaptive-calibration.js";

export function CalibrationFlow({
  publicPractice = false,
}: {
  publicPractice?: boolean;
}) {
  const router = useRouter();
  const calibrationScale = useBrowserCalibrationScale();
  const dpiId = useId();
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [path, setPath] = useState<"convert" | "test">("convert");
  const [game, setGame] = useState<VerifiedSensitivityProfileId>("valorant");
  const [gameValue, setGameValue] = useState("");
  const [startingValue, setStartingValue] = useState<string | null>(null);
  const [pair, setPair] = useState<CalibrationPair | null>(null);
  const [outcomes, setOutcomes] = useState<readonly PairOutcome[]>([]);
  const completedTrial = useRef(-1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedValue, setSavedValue] = useState<string | null>(null);
  const homeHref = publicPractice ? "/#guest-play" : "/app";
  const homeLabel = publicPractice ? "Play as guest" : "Back to trainer home";

  useEffect(() => {
    if (publicPractice) {
      setSettings(loadGuestTrainerSettings());
      return;
    }
    let active = true;
    const client = new BrowserApiClient();
    void (async () => {
      const session = await client.getSession();
      if (!active) return;
      if (!session?.user) {
        router.replace("/login?next=/app/calibrate");
        return;
      }
      const response = await client.getTrainerSettings();
      if (!active) return;
      const parsed = TrainerSettingsSchema.safeParse(response.data);
      if (!response.ok || !parsed.success) {
        setError(response.error ?? "Could not load trainer settings.");
        return;
      }
      setSettings(parsed.data);
    })().catch(() => {
      if (active) setError("Could not connect to the account service.");
    });
    return () => {
      active = false;
    };
  }, [publicPractice, router]);

  const converted = convertGameSetting(game, gameValue, calibrationScale);
  const validConversion = converted !== null && isBrowserSensitivity(converted);
  const defaultStartingValue = validConversion
    ? formatSensitivity(converted)
    : (settings?.fmsSensitivity ?? "1");
  const startingSensitivity = startingValue ?? defaultStartingValue;
  const result =
    outcomes.length === COMPARISONS.length ? outcomes.at(-1)! : null;
  const hasScore = outcomes.some((entry) => entry.hasScore);
  const strafeBest = outcomes.find(
    (entry) => entry.strafeOnTarget !== null,
  )?.strafeOnTarget;
  const selectedSensitivity = result
    ? hasScore
      ? result.preferred
      : null
    : path === "convert" && validConversion
      ? converted
      : null;
  const comparison = pair ? COMPARISONS[pair.index]! : null;
  const trialNumber = pair ? pair.index * 2 + (pair.first ? 1 : 0) : 0;

  function reset() {
    setPair(null);
    setOutcomes([]);
    setError(null);
  }

  function start() {
    const startValue = parseSensitivityInput(startingSensitivity);
    if (startValue === null || !isBrowserSensitivity(startValue)) {
      setError("Enter a starting sensitivity from 0.000001 to 100.");
      return;
    }
    const seed = generateRunSeed();
    completedTrial.current = -1;
    setError(null);
    setOutcomes([]);
    setPair(buildPair(0, startValue, 1, (seed[0] & 1) === 0, seed));
  }

  const completeTrial = useCallback(
    (score: RuntimeScoreResult) => {
      if (!pair || !comparison || completedTrial.current >= trialNumber) return;
      completedTrial.current = trialNumber;
      const outcome = recordTrial(
        comparison.mode,
        pair.candidates[pair.first ? 1 : 0],
        score,
      );
      if (!pair.first) {
        setPair({ ...pair, first: outcome });
        return;
      }
      const comparisonResult = comparePair(pair, pair.first, outcome);
      setOutcomes((previous) => [...previous, comparisonResult]);
      const nextIndex = pair.index + 1;
      setPair(
        nextIndex < COMPARISONS.length
          ? buildPair(
              nextIndex,
              comparisonResult.preferred,
              comparisonResult.direction,
              !pair.lowerFirst,
              generateRunSeed(),
            )
          : null,
      );
    },
    [comparison, pair, trialNumber],
  );

  async function saveSensitivity() {
    if (!settings || selectedSensitivity === null) return;
    const value = formatSensitivity(selectedSensitivity);
    const next = { ...settings, fmsSensitivity: value };
    setSaving(true);
    setError(null);
    try {
      if (publicPractice) saveGuestTrainerSettings(next);
      else {
        const response = await new BrowserApiClient().saveTrainerSettings(next);
        if (!response.ok) {
          setError(response.error ?? "Could not save sensitivity.");
          return;
        }
      }
      setSettings(next);
      setSavedValue(value);
    } catch {
      setError("Could not save sensitivity. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (settings && pair && comparison) {
    const trackingHint =
      comparison.mode === "strafe"
        ? ` Aim to stay on target at least ${STRAFE_TARGET_PERCENT}% of the time.`
        : "";
    return (
      <TrainerBootstrap
        key={trialNumber}
        mode={comparison.mode}
        durationTicks={TRIAL_SECONDS * 128}
        countdownSeconds={COUNTDOWN_SECONDS}
        runSeed={pair.seed}
        sensitivityOverride={formatSensitivity(
          pair.candidates[pair.first ? 1 : 0],
        )}
        settingsOverride={settings}
        runLabel={`${comparison.label}: trial ${pair.first ? "B" : "A"} · ${trialNumber + 1} of ${COMPARISONS.length * 2}.${trackingHint}`}
        onRunComplete={completeTrial}
        lockedConfiguration
        guest={publicPractice}
      />
    );
  }

  if (!settings) {
    return (
      <main className="app-shell">
        <p className="app-subtext" role={error ? "alert" : "status"}>
          {error ?? "Loading trainer settings…"}
        </p>
      </main>
    );
  }

  const equivalent =
    result && selectedSensitivity !== null
      ? runtimeFmsToGameSensitivity(
          game,
          selectedSensitivity,
          settings.nominalDpi ?? 800,
          calibrationScale,
        ).conversion
      : null;

  return (
    <main className="app-shell">
      <section className="app-card app-card-wide">
        <BackLink href={homeHref} label={homeLabel} />
        <h1 className="app-heading">
          {result ? "Your sensitivity estimate" : "Find My Sensi"}
        </h1>
        {result ? (
          <>
            {hasScore ? (
              <>
                <p
                  className="app-subtext"
                  data-testid="recommended-browser-sensitivity"
                >
                  Recommended FindMySensi sensitivity:{" "}
                  <strong>{formatSensitivity(result.preferred)}</strong>
                </p>
                <p className="app-subtext">
                  Approximate range: {formatSensitivity(result.low)}–
                  {formatSensitivity(result.high)}
                </p>
                <p className="app-help">
                  {result.decisive
                    ? "This setting scored higher in the final comparison."
                    : "The final scores were close, so the test kept the previous best setting."}
                </p>
                {strafeBest != null && (
                  <p className="app-help">
                    Best Strafe Track time on target: {strafeBest.toFixed(1)}% ·
                    Goal: {STRAFE_TARGET_PERCENT}%
                  </p>
                )}
                <SensitivityGamePicker
                  legend="View an in-game equivalent"
                  selected={game}
                  onSelect={setGame}
                />
                {equivalent && (
                  <p className="app-subtext">
                    {SENSITIVITY_PROFILES[game].name}:{" "}
                    {formatSensitivity(equivalent.targetSensitivity)}
                    {settings.nominalDpi
                      ? ` · ${equivalent.formattedCmPer360} cm/360 estimated`
                      : ""}
                  </p>
                )}
              </>
            ) : (
              <p className="app-subtext">
                No hits or tracking time were recorded. Try again to get an
                estimate.
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              className="app-chip"
              style={{ marginBlock: 12 }}
            >
              Run again
            </button>
          </>
        ) : (
          <>
            <div
              className="converter-preset-buttons"
              style={{ marginBlock: 20 }}
            >
              <button
                type="button"
                aria-pressed={path === "convert"}
                className="app-chip"
                onClick={() => {
                  reset();
                  setPath("convert");
                }}
              >
                I know my in-game sensitivity
              </button>
              <button
                type="button"
                aria-pressed={path === "test"}
                className="app-chip"
                onClick={() => {
                  reset();
                  setPath("test");
                }}
              >
                I don’t know my sensitivity
              </button>
            </div>
            {path === "convert" ? (
              <>
                <SensitivityGamePicker
                  legend="Which game do you use?"
                  selected={game}
                  onSelect={setGame}
                />
                <label className="app-field">
                  <span className="settings-label">In-game sensitivity</span>
                  <input
                    className="app-input"
                    type="text"
                    inputMode="decimal"
                    value={gameValue}
                    onChange={(event) => setGameValue(event.target.value)}
                  />
                </label>
                <div className="app-subtext">
                  FindMySensi browser sensitivity:{" "}
                  <output data-testid="calibration-conversion">
                    {validConversion ? formatSensitivity(converted) : "—"}
                  </output>
                </div>
                <p className="app-help">
                  {converted !== null && !validConversion
                    ? "That setting converts outside the supported FindMySensi range."
                    : "Uses the active browser calibration estimate. Use the same DPI in-game and in the trainer."}
                </p>
              </>
            ) : (
              <>
                <p className="app-subtext">
                  Compare two hidden settings at a time in Grid Rush, Headshot
                  Lane, Strafe Track, Multi Burst, Reflex Rush, and Micro Flick.
                  Play {TRIAL_SECONDS}-second trials with{" "}
                  {Math.floor(ACTIVE_SECONDS / 60)} minutes{" "}
                  {ACTIVE_SECONDS % 60} seconds of active training.
                </p>
                <p className="app-help">
                  Aim for {STRAFE_TARGET_PERCENT}% time on target in Strafe
                  Track. The last comparison fine-tunes the result in steps of
                  0.01 or smaller.
                </p>
                <label className="app-field">
                  <span className="settings-label">
                    Starting browser sensitivity
                  </span>
                  <input
                    className="app-input"
                    type="text"
                    inputMode="decimal"
                    value={startingSensitivity}
                    onChange={(event) => setStartingValue(event.target.value)}
                  />
                </label>
                <p className="app-help">
                  Starting value:{" "}
                  <output data-testid="calibration-starting-sensitivity">
                    {startingSensitivity || "—"}
                  </output>
                </p>
                <button type="button" className="app-button" onClick={start}>
                  Start Find My Sensi
                </button>
              </>
            )}
          </>
        )}
        {!pair && (path === "test" || result) && (
          <div className="app-field" style={{ marginTop: 16 }}>
            <label className="settings-label" htmlFor={dpiId}>
              Mouse DPI (optional)
            </label>
            <input
              id={dpiId}
              className="app-input"
              type="number"
              min={1}
              max={100000}
              value={settings.nominalDpi ?? ""}
              onChange={(event) => {
                const number = Number(event.target.value);
                setSettings({
                  ...settings,
                  nominalDpi:
                    Number.isInteger(number) && number > 0 && number <= 100000
                      ? number
                      : null,
                });
              }}
            />
          </div>
        )}
        {error && (
          <p className="app-alert" role="alert">
            {error}
          </p>
        )}
        {(path === "convert" || result) && selectedSensitivity !== null && (
          <button
            type="button"
            className="app-button"
            onClick={saveSensitivity}
            disabled={
              saving || savedValue === formatSensitivity(selectedSensitivity)
            }
            style={{ marginTop: 16 }}
          >
            {saving
              ? "Saving…"
              : savedValue === formatSensitivity(selectedSensitivity)
                ? "Sensitivity saved"
                : publicPractice
                  ? "Save for guest drills"
                  : "Use this sensitivity"}
          </button>
        )}
        <p className="app-help">
          Calibration trials stay off the leaderboards.
        </p>
      </section>
    </main>
  );
}

function convertGameSetting(
  game: VerifiedSensitivityProfileId,
  text: string,
  calibrationScale: Parameters<typeof applyBrowserInputCalibration>[1],
): number | null {
  const raw = text.trim();
  if (!parseSensitivityInput(raw) || raw.length > 40) return null;
  try {
    return applyBrowserInputCalibration(
      Number(gameSensitivityToFms(game, raw)),
      calibrationScale,
    );
  } catch {
    return null;
  }
}
