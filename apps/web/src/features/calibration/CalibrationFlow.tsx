"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { TrainerSettings } from "@findmysensi/protocol";
import { TrainerSettingsSchema } from "@findmysensi/protocol";
import {
  buildCandidateOrder,
  generateSensitivityCandidates,
  recommendSensitivityAcrossModes,
  type ModeCandidateScore,
  type MultiModeRecommendation,
  type RuntimeScoreResult,
} from "@findmysensi/trainer-runtime";
import { BackLink } from "../../components/BackLink.js";
import { TrainerBootstrap } from "../../trainer/TrainerBootstrap.js";

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
  readonly modeId: string;
}

export function CalibrationFlow() {
  const router = useRouter();
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
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

  useEffect(() => {
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
  }, [router]);

  const currentBlock = blocks[blockIndex] ?? null;
  const title = "Find My Sensi";

  const start = () => {
    if (!settings) return;
    const seed = makeSeed();
    const base = Number(settings.fmsSensitivity ?? "1");
    const candidates = generateSensitivityCandidates(base);
    if (
      candidates.some(
        (candidate) => parseSensitivity(String(candidate)) === null,
      )
    ) {
      setError(
        "Saved sensitivity cannot be tested in the supported 0-100 range.",
      );
      return;
    }
    const built: CalibrationBlock[] = [];
    FIND_MODES.forEach((modeId, modeIndex) => {
      // Shuffle each mode's five candidates independently so block order is
      // counterbalanced within every mode, not just once overall.
      const modeSeed: readonly [number, number, number, number] = [
        (seed[0] ^ (modeIndex * 0x9e3779b1)) >>> 0,
        (seed[1] + modeIndex * 0x85ebca6b) >>> 0,
        (seed[2] ^ ((modeIndex + 1) * 0xc2b2ae35)) >>> 0,
        (seed[3] + modeIndex + 1) >>> 0,
      ];
      buildCandidateOrder(candidates.length, modeSeed).forEach(
        (candidateIndex, candidateBlockIndex) => {
          built.push({
            id: `${modeId}-${candidateBlockIndex + 1}`,
            sensitivity: candidates[candidateIndex]!,
            modeId,
          });
        },
      );
    });
    setBlocks(built);
    setError(null);
    setBlockIndex(0);
    setModeScores([]);
    setRecommendation(null);
    setSaved(false);
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
          startingSensitivity: Number(settings?.fmsSensitivity ?? "1"),
          weights: FIND_MODE_WEIGHTS,
        }),
      );
    },
    [blockIndex, blocks.length, currentBlock, modeScores, settings],
  );

  const selectedSensitivity = recommendation?.sensitivity ?? null;

  const saveSelected = async () => {
    if (!settings || selectedSensitivity === null) return;
    setSaving(true);
    const nextSettings = {
      ...settings,
      fmsSensitivity: formatSensitivity(selectedSensitivity),
    };
    const response = await new BrowserApiClient().saveTrainerSettings(
      nextSettings,
    );
    setSaving(false);
    if (!response.ok) {
      setError(response.error ?? "Could not save sensitivity.");
      return;
    }
    setSettings(nextSettings);
    setSaved(true);
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
        mode={currentBlock.modeId}
        durationTicks={FIND_BLOCK_DURATION_TICKS}
        sensitivityOverride={formatSensitivity(currentBlock.sensitivity)}
        settingsOverride={settings}
        runLabel={`${title}: ${
          FIND_MODE_LABELS[currentBlock.modeId as FindModeId] ??
          currentBlock.modeId
        }, block ${blockIndex + 1} of ${blocks.length}`}
        onRunComplete={completeBlock}
        lockedConfiguration
      />
    );
  }

  if (recommendation) {
    return (
      <main className="app-shell">
        <section className="app-card app-card-wide">
          <BackLink href="/app" label="Back to trainer home" />
          <p className="app-kicker" style={{ marginBottom: 8 }}>
            {title} complete
          </p>
          <h1 className="app-heading">
            Recommended: {formatSensitivity(recommendation.sensitivity)}
          </h1>
          <p className="app-subtext">{recommendation.reason}</p>
          <p
            style={{
              marginTop: 8,
              fontFamily: "monospace",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Confidence: {recommendation.confidence}
          </p>
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
              href="/app"
              className="app-link"
              style={{ alignSelf: "center" }}
            >
              Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="app-card app-card-wide">
        <BackLink href="/app" label="Back to trainer home" />
        <p className="app-kicker" style={{ marginBottom: 8 }}>
          Performance test
        </p>
        <h1 className="app-heading">{title}</h1>
        <p className="app-subtext">
          Run 25 blinded 12-second blocks: five sensitivities across Grid Rush,
          Multi Burst, Strafe Track, Sphere Track, and Reflex Rush. Each mode is
          scored on its own scale, then combined. The two tracking modes count
          half -- most players track moving targets poorly at any sensitivity.
        </p>
        {error ? (
          <p className="app-alert" style={{ marginTop: 16 }}>
            {error}
          </p>
        ) : null}
        <button
          onClick={start}
          className="app-button"
          style={{ marginTop: 24 }}
        >
          Start {title}
        </button>
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

function parseSensitivity(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
}

function formatSensitivity(value: number): string {
  return Number(value.toFixed(6)).toString();
}

function makeSeed(): readonly [number, number, number, number] {
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return [values[0]!, values[1]!, values[2]!, values[3]!];
}
