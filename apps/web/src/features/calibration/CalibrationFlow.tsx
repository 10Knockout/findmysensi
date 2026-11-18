"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { TrainerSettings } from "@findmysensi/protocol";
import { TrainerSettingsSchema } from "@findmysensi/protocol";
import {
  buildCandidateOrder,
  recommendSensitivityAcrossModes,
  type ModeCandidateScore,
  type MultiModeRecommendation,
  type RuntimeScoreResult,
} from "@findmysensi/trainer-runtime";
import {
  SENSITIVITY_PROFILES,
  applyBrowserInputCalibration,
  gameSensitivityToFms,
  runtimeFmsToGameSensitivity,
  type VerifiedSensitivityProfileId,
} from "@findmysensi/sensitivity";
import { BackLink } from "../../components/BackLink.js";
import { SensitivityGamePicker } from "../../components/SensitivityGamePicker.js";
import { TrainerBootstrap } from "../../trainer/TrainerBootstrap.js";
import { useBrowserCalibrationScale } from "../../lib/browser-calibration.js";
import {
  loadGuestTrainerSettings,
  saveGuestTrainerSettings,
} from "../../trainer/guest-settings.js";
import {
  discoveryCandidates,
  parseCalibrationSensitivity,
  refinementCandidates,
} from "./calibration-candidates.js";

const FIND_BLOCK_DURATION_TICKS = 12 * 128;

// Five families that stress different parts of aim: flicking, target
// selection, moving targets, smooth tracking, and reaction acquisition. A
// sensitivity that only wins at Gridshot is not the one to keep.
const FIND_MODES = [
  "grid",
  "multi",
  "strafe",
  "smooth-track",
  "reaction",
] as const;
type FindModeId = (typeof FIND_MODES)[number];
const FIND_MODE_LABELS: Record<FindModeId, string> = {
  grid: "Grid Rush",
  multi: "Multi Burst",
  strafe: "Strafe Track",
  "smooth-track": "Sphere Track",
  reaction: "Reflex Rush",
};

// Most players track moving targets poorly at every sensitivity, so a
// tracking block says more about raw skill than about fit. Both no-click
// tracking modes still count, at half weight, so they can break a tie
// without dominating the result.
const FIND_MODE_WEIGHTS: Partial<Record<FindModeId, number>> = {
  "smooth-track": 0.5,
  strafe: 0.5,
};

interface CalibrationBlock {
  readonly id: string;
  readonly sensitivity: number;
  readonly modeId: FindModeId;
}

export function CalibrationFlow({
  publicPractice = false,
}: {
  publicPractice?: boolean;
}) {
  const router = useRouter();
  const calibrationScale = useBrowserCalibrationScale();
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [startingText, setStartingText] = useState<string | null>(null);
  const [stage, setStage] = useState<"discovery" | "refinement">("discovery");
  const [phaseBaseline, setPhaseBaseline] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<readonly CalibrationBlock[]>([]);
  const [blockIndex, setBlockIndex] = useState(0);
  const [modeScores, setModeScores] = useState<readonly ModeCandidateScore[]>(
    [],
  );
  const [recommendation, setRecommendation] =
    useState<MultiModeRecommendation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [targetGame, setTargetGame] =
    useState<VerifiedSensitivityProfileId>("valorant");

  useEffect(() => {
    if (publicPractice) {
      setSettings(loadGuestTrainerSettings());
      return;
    }
    const client = new BrowserApiClient();
    void (async () => {
      try {
        const session = await client.getSession();
        if (!session?.user) {
          router.replace(`/login?next=${encodeURIComponent("/app/calibrate")}`);
          return;
        }
        const response = await client.getTrainerSettings();
        if (!response.ok || !response.data) {
          setError(response.error ?? "Could not load trainer settings.");
          return;
        }
        const parsed = TrainerSettingsSchema.safeParse(response.data);
        if (!parsed.success) {
          console.warn(
            "[calibrate] saved settings rejected",
            parsed.error.issues,
          );
          setError("Saved trainer settings are invalid.");
          return;
        }
        setSettings(parsed.data);
      } catch {
        setError("Could not connect to the account service.");
      }
    })();
  }, [publicPractice, router]);

  const currentBlock = blocks[blockIndex] ?? null;
  const title = "Find My Sensi";
  const homeHref = publicPractice ? "/#guest-play" : "/app";
  const homeLabel = publicPractice ? "Play as guest" : "Back to trainer home";
  const startingSensitivityText =
    startingText ?? settings?.fmsSensitivity ?? "1";

  const useStartingPreset = (game: "valorant" | "cs2", sensitivity: string) => {
    if (!settings) return;
    const runtime = applyBrowserInputCalibration(
      Number(gameSensitivityToFms(game, sensitivity)),
      calibrationScale,
    );
    setStartingText(formatSensitivity(runtime));
    setTargetGame(game);
    setError(null);
  };

  const startPhase = (nextStage: "discovery" | "refinement", base: number) => {
    const seed = makeSeed();
    const candidates =
      nextStage === "refinement"
        ? refinementCandidates(base)
        : discoveryCandidates(base);
    if (candidates.length < 2) {
      setError(
        "Choose a higher starting sensitivity to compare distinct values.",
      );
      return;
    }
    const built: CalibrationBlock[] = [];
    FIND_MODES.forEach((modeId, modeIndex) => {
      // Shuffle candidates independently for each mode.
      const modeSeed: readonly [number, number, number, number] = [
        (seed[0] ^ (modeIndex * 0x9e3779b1)) >>> 0,
        (seed[1] + modeIndex * 0x85ebca6b) >>> 0,
        (seed[2] ^ ((modeIndex + 1) * 0xc2b2ae35)) >>> 0,
        (seed[3] + modeIndex + 1) >>> 0,
      ];
      buildCandidateOrder(candidates.length, modeSeed).forEach(
        (candidateIndex, candidateBlockIndex) => {
          built.push({
            id: `${nextStage}-${modeId}-${candidateBlockIndex + 1}`,
            sensitivity: candidates[candidateIndex]!,
            modeId,
          });
        },
      );
    });
    setStage(nextStage);
    setPhaseBaseline(base);
    setBlocks(built);
    setError(null);
    setBlockIndex(0);
    setModeScores([]);
    setRecommendation(null);
    setSaved(false);
  };

  const start = (nextStage: "discovery" | "refinement") => {
    if (!publicPractice && !settings?.nominalDpi) {
      setError("Enter your mouse DPI before starting the sensitivity test.");
      return;
    }
    const base = parseCalibrationSensitivity(startingSensitivityText);
    if (base === null) {
      setError("Enter a starting sensitivity from 0.000001 to 100.");
      return;
    }
    startPhase(nextStage, base);
  };

  const completeBlock = useCallback(
    (score: RuntimeScoreResult) => {
      if (!currentBlock) return;

      // score.score is the one number every mode adapter reports; raw ranges
      // differ per mode and are normalized later.
      const nextScores = [
        ...modeScores,
        {
          modeId: currentBlock.modeId,
          sensitivity: currentBlock.sensitivity,
          score: score.score,
        },
      ];
      setModeScores(nextScores);
      if (blockIndex + 1 < blocks.length) {
        setBlockIndex(blockIndex + 1);
        return;
      }
      setRecommendation(
        recommendSensitivityAcrossModes(nextScores, {
          startingSensitivity: phaseBaseline,
          weights: FIND_MODE_WEIGHTS,
        }),
      );
    },
    [blockIndex, blocks.length, currentBlock, modeScores, phaseBaseline],
  );

  const selectedSensitivity = recommendation?.sensitivity ?? null;
  const displayedRecommendation = useMemo(() => {
    if (selectedSensitivity === null || !settings?.nominalDpi) return null;
    try {
      return runtimeFmsToGameSensitivity(
        targetGame,
        selectedSensitivity,
        settings.nominalDpi,
        calibrationScale,
      );
    } catch {
      return null;
    }
  }, [selectedSensitivity, settings, targetGame, calibrationScale]);

  const saveSelected = async () => {
    if (!settings || selectedSensitivity === null) return;
    setSaving(true);
    const nextSettings = {
      ...settings,
      fmsSensitivity: formatSensitivity(selectedSensitivity),
    };
    if (publicPractice) {
      saveGuestTrainerSettings(nextSettings);
      setSettings(nextSettings);
      setStartingText(null);
      setSaved(true);
      setSaving(false);
      return;
    }
    try {
      const response = await new BrowserApiClient().saveTrainerSettings(
        nextSettings,
      );
      if (!response.ok) {
        setError(response.error ?? "Could not save sensitivity.");
        return;
      }
      setSettings(nextSettings);
      setStartingText(null);
      setSaved(true);
    } catch {
      setError("Could not connect to the account service.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setBlocks([]);
    setBlockIndex(0);
    setModeScores([]);
    setRecommendation(null);
    setError(null);
    setSaved(false);
  };

  if (error && !settings) return <Status message={error} />;
  if (!settings) return <Status message="Loading trainer settings…" />;

  if (currentBlock && !recommendation) {
    return (
      <TrainerBootstrap
        key={currentBlock.id}
        mode={currentBlock.modeId}
        durationTicks={FIND_BLOCK_DURATION_TICKS}
        sensitivityOverride={formatSensitivity(currentBlock.sensitivity)}
        settingsOverride={settings}
        runLabel={`${stage === "refinement" ? "Fine comparison" : "Discovery"}: ${
          FIND_MODE_LABELS[currentBlock.modeId]
        }, block ${blockIndex + 1} of ${blocks.length}`}
        onRunComplete={completeBlock}
        lockedConfiguration
        guest={publicPractice}
      />
    );
  }

  if (recommendation) {
    return (
      <main className="app-shell">
        <section className="app-card app-card-wide">
          <BackLink href={homeHref} label={homeLabel} />
          <p className="app-kicker" style={{ marginBottom: 8 }}>
            {stage === "discovery"
              ? "Discovery results"
              : "Fine comparison results"}
          </p>
          <h1 className="app-heading">Your sensitivity recommendation</h1>
          <p
            className="app-subtext"
            data-testid="recommended-browser-sensitivity"
          >
            FindMySensi browser sensitivity:{" "}
            {formatSensitivity(recommendation.sensitivity)}
          </p>
          <div style={{ marginTop: 18 }}>
            <p className="settings-label">
              {SENSITIVITY_PROFILES[targetGame].name}
            </p>
            <p
              data-testid="recommended-game-sensitivity"
              style={{
                marginTop: 4,
                color: "var(--fms-acid)",
                fontFamily: "monospace",
                fontSize: "clamp(42px, 9vw, 68px)",
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {displayedRecommendation
                ? formatSensitivity(
                    displayedRecommendation.conversion.targetSensitivity,
                  )
                : "Add DPI below"}
            </p>
          </div>
          <p className="app-subtext">
            {recommendation.confidence === "LOW"
              ? "Scores were close across the drills, so this round kept its starting value."
              : "This value had the strongest combined result across the drills tested in this round."}
          </p>
          <p
            style={{
              marginTop: 8,
              fontFamily: "monospace",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Score separation: {recommendation.confidence.toLowerCase()}. Short
            runs vary, so repeat the comparison before switching if scores are
            close.
          </p>
          {displayedRecommendation ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                marginTop: 18,
                fontFamily: "monospace",
                fontSize: 13,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              <span>
                Estimated turn distance:{" "}
                {displayedRecommendation.conversion.formattedCmPer360} cm / 360°
              </span>
              <span>
                Canonical Aimlabs Default:{" "}
                {formatSensitivity(
                  displayedRecommendation.canonicalFmsSensitivity,
                )}
              </span>
              <span>
                Adapter v{SENSITIVITY_PROFILES[targetGame].version} ·{" "}
                {SENSITIVITY_PROFILES[targetGame].verificationLevel}
              </span>
            </div>
          ) : null}
          <div style={{ marginTop: 24 }}>
            <DpiField settings={settings} onChange={setSettings} />
            <SensitivityGamePicker
              legend="View equivalents"
              selected={targetGame}
              onSelect={setTargetGame}
            />
          </div>
          {error ? (
            <p className="app-alert" style={{ marginTop: 16 }}>
              {error}
            </p>
          ) : null}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {stage === "discovery" && (
              <button
                onClick={() =>
                  startPhase("refinement", recommendation.sensitivity)
                }
                className="app-button"
                style={{ width: "auto", padding: "0 22px" }}
              >
                Compare in 0.01 steps
              </button>
            )}
            {selectedSensitivity !== null ? (
              <button
                onClick={saveSelected}
                disabled={saving || saved}
                className="app-button"
                style={{ width: "auto", padding: "0 22px" }}
              >
                {saving
                  ? "Saving…"
                  : saved
                    ? "Sensitivity saved"
                    : publicPractice
                      ? "Save for guest drills"
                      : "Use this sensitivity"}
              </button>
            ) : null}
            <button
              onClick={reset}
              className="app-button app-button-ghost"
              style={{ width: "auto", padding: "0 22px" }}
            >
              Run again
            </button>
            <Link
              href={homeHref}
              className="app-link"
              style={{ alignSelf: "center" }}
            >
              {publicPractice ? "Play a guest drill" : "Dashboard"}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="app-card app-card-wide">
        <BackLink href={homeHref} label={homeLabel} />
        <p className="app-kicker" style={{ marginBottom: 8 }}>
          Performance test
        </p>
        <h1 className="app-heading">{title}</h1>
        <p className="app-subtext">
          Compare up to five hidden sensitivity values across Grid Rush, Multi
          Burst, Strafe Track, Sphere Track, and Reflex Rush. Each run takes 12
          seconds. Compare the strongest result against values 0.01 apart in a
          second round.
        </p>
        {publicPractice && (
          <p className="app-help">
            Free to try. Your results stay in this browser and off the
            leaderboard.
          </p>
        )}
        <div style={{ marginTop: 22 }}>
          <label className="app-field">
            <span className="settings-label">Starting browser sensitivity</span>
            <input
              className="app-input"
              type="text"
              inputMode="decimal"
              value={startingSensitivityText}
              onChange={(event) => setStartingText(event.target.value)}
            />
          </label>
          {!publicPractice && (
            <p className="app-help">
              Starting value:{" "}
              <output data-testid="calibration-starting-sensitivity">
                {startingSensitivityText || "—"}
              </output>
            </p>
          )}
          <DpiField settings={settings} onChange={setSettings} />
          {publicPractice && (
            <p className="app-help">
              DPI is optional. It lets you see estimated equivalents in other
              games.
            </p>
          )}
          <SensitivityGamePicker
            legend="What game do you want to use this sensitivity in?"
            selected={targetGame}
            onSelect={setTargetGame}
          />
          <p className="settings-label" style={{ marginTop: 20 }}>
            Starting sensitivity presets
          </p>
          <div className="converter-preset-buttons">
            <button
              type="button"
              className="settings-chip"
              onClick={() => useStartingPreset("valorant", "0.125")}
            >
              Valorant 0.125
            </button>
            <button
              type="button"
              className="settings-chip"
              onClick={() => useStartingPreset("cs2", "0.398")}
            >
              CS2 0.398
            </button>
          </div>
          <p className="app-help" style={{ marginTop: 10 }}>
            Presets use your active browser multiplier. Your saved settings
            change only when you use the final recommendation.
          </p>
          {publicPractice && (
            <Link href="/tools/converter" className="app-link">
              Convert a sensitivity to FindMySensi
            </Link>
          )}
        </div>
        {error ? (
          <p className="app-alert" style={{ marginTop: 16 }}>
            {error}
          </p>
        ) : null}
        <button
          onClick={() => start("discovery")}
          className="app-button"
          style={{ marginTop: 24 }}
        >
          Start {title}
        </button>
        {publicPractice && (
          <button
            type="button"
            onClick={() => start("refinement")}
            className="app-button app-button-ghost"
            style={{ marginTop: 12 }}
          >
            Compare in 0.01 steps
          </button>
        )}
      </section>
    </main>
  );
}

function Status({ message }: { message: string }) {
  return (
    <main className="app-shell">
      <p
        style={{
          fontFamily: "monospace",
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {message}
      </p>
    </main>
  );
}

function DpiField({
  settings,
  onChange,
}: {
  settings: TrainerSettings;
  onChange: (settings: TrainerSettings) => void;
}) {
  return (
    <label className="app-field">
      <span className="settings-label">Mouse DPI</span>
      <input
        className="app-input"
        type="number"
        min={1}
        max={100000}
        step={1}
        value={settings.nominalDpi ?? ""}
        onChange={(event) => {
          const value = Number(event.target.value);
          onChange({
            ...settings,
            nominalDpi:
              Number.isInteger(value) && value > 0 && value <= 100000
                ? value
                : null,
          });
        }}
      />
    </label>
  );
}

function formatSensitivity(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function makeSeed(): readonly [number, number, number, number] {
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return [values[0]!, values[1]!, values[2]!, values[3]!];
}
