"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrowserApiClient } from "@findmysensi/api-client";
import type { TrainerSettings } from "@findmysensi/protocol";
import { TrainerSettingsSchema } from "@findmysensi/protocol";
import {
  buildBattleOrder,
  buildCandidateOrder,
  decideBattle,
  generateSensitivityCandidates,
  recommendSensitivityAcrossModes,
  type BattleDecision,
  type CandidateResult,
  type ModeCandidateScore,
  type MultiModeRecommendation,
  type RuntimeScoreResult,
} from "@findmysensi/trainer-runtime";
import { TrainerBootstrap } from "../../trainer/TrainerBootstrap.js";

const BATTLE_BLOCK_DURATION_TICKS = 15 * 128;
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

export function CalibrationFlow({ kind }: { kind: "find" | "battle" }) {
  const router = useRouter();
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<readonly CalibrationBlock[]>([]);
  const [blockIndex, setBlockIndex] = useState(0);
  const [results, setResults] = useState<readonly CandidateResult[]>([]);
  const [modeScores, setModeScores] = useState<readonly ModeCandidateScore[]>(
    [],
  );
  const [recommendation, setRecommendation] =
    useState<MultiModeRecommendation | null>(null);
  const [battleDecision, setBattleDecision] = useState<BattleDecision | null>(
    null,
  );
  const [candidateA, setCandidateA] = useState("0.175");
  const [candidateB, setCandidateB] = useState("0.2");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const client = new BrowserApiClient();
    void (async () => {
      try {
        const session = await client.getSession();
        if (!session?.user) {
          router.replace(
            `/login?next=${encodeURIComponent(
              kind === "find" ? "/app/calibrate" : "/app/sensi-battle",
            )}`,
          );
          return;
        }
        const response = await client.getTrainerSettings();
        if (!response.ok || !response.data) {
          setError(response.error ?? "Could not load trainer settings.");
          return;
        }
        const parsed = TrainerSettingsSchema.safeParse(response.data);
        if (!parsed.success) {
          setError("Saved trainer settings are invalid.");
          return;
        }
        setSettings(parsed.data);
        if (parsed.data.fmsSensitivity) {
          setCandidateA(parsed.data.fmsSensitivity);
          setCandidateB(
            Math.min(Number(parsed.data.fmsSensitivity) * 1.1, 100).toFixed(4),
          );
        }
      } catch {
        setError("Could not connect to the account service.");
      }
    })();
  }, [kind, router]);

  const currentBlock = blocks[blockIndex] ?? null;
  const title = kind === "find" ? "Find My Sensi" : "Sensi Battle";

  const start = () => {
    if (!settings) return;
    const seed = makeSeed();
    if (kind === "find") {
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
          (candidateIndex, blockIndex) => {
            built.push({
              id: `${modeId}-${blockIndex + 1}`,
              sensitivity: candidates[candidateIndex]!,
              modeId,
            });
          },
        );
      });
      setBlocks(built);
    } else {
      const a = parseSensitivity(candidateA);
      const b = parseSensitivity(candidateB);
      if (a === null || b === null || a === b) {
        setError("Enter two different positive sensitivities.");
        return;
      }
      const values = { A: a, B: b } as const;
      setBlocks(
        buildBattleOrder(seed).map((id) => ({
          id,
          sensitivity: values[id],
          modeId: "grid",
        })),
      );
    }
    setError(null);
    setBlockIndex(0);
    setResults([]);
    setModeScores([]);
    setRecommendation(null);
    setBattleDecision(null);
    setSaved(false);
  };

  const completeBlock = useCallback(
    (score: RuntimeScoreResult) => {
      if (!currentBlock) return;

      if (kind === "find") {
        // score.score is the one number every mode adapter reports; raw
        // ranges differ per mode and are normalized later.
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
        return;
      }

      if (!("accuracyPercentage" in score.metrics)) return;
      const nextResults = [
        ...results,
        {
          sensitivity: currentBlock.sensitivity,
          accuracyPercentage: score.metrics.accuracyPercentage,
        },
      ];
      setResults(nextResults);
      if (blockIndex + 1 < blocks.length) {
        setBlockIndex(blockIndex + 1);
        return;
      }
      const byId = new Map(
        blocks.map((block, index) => [block.id, nextResults[index]!] as const),
      );
      setBattleDecision(
        decideBattle(
          { id: "A", accuracyPercentage: byId.get("A")!.accuracyPercentage },
          { id: "B", accuracyPercentage: byId.get("B")!.accuracyPercentage },
        ),
      );
    },
    [blockIndex, blocks, currentBlock, kind, modeScores, results, settings],
  );

  const selectedSensitivity = useMemo(() => {
    if (recommendation) return recommendation.sensitivity;
    if (!battleDecision || battleDecision.winner === "COULD_NOT_TELL")
      return null;
    const winner = blocks.find((block) => block.id === battleDecision.winner);
    return winner?.sensitivity ?? null;
  }, [battleDecision, blocks, recommendation]);

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
    setResults([]);
    setModeScores([]);
    setRecommendation(null);
    setBattleDecision(null);
    setError(null);
    setSaved(false);
  };

  if (error && !settings) return <Status message={error} />;
  if (!settings) return <Status message="Loading trainer settings…" />;

  if (currentBlock && !recommendation && !battleDecision) {
    return (
      <TrainerBootstrap
        mode={currentBlock.modeId}
        durationTicks={
          kind === "find"
            ? FIND_BLOCK_DURATION_TICKS
            : BATTLE_BLOCK_DURATION_TICKS
        }
        sensitivityOverride={formatSensitivity(currentBlock.sensitivity)}
        settingsOverride={settings}
        runLabel={
          kind === "find"
            ? `${title}: ${
                FIND_MODE_LABELS[currentBlock.modeId as FindModeId] ??
                currentBlock.modeId
              }, block ${blockIndex + 1} of ${blocks.length}`
            : `${title}: block ${blockIndex + 1} of ${blocks.length}`
        }
        onRunComplete={completeBlock}
        lockedConfiguration
      />
    );
  }

  if (recommendation || battleDecision) {
    const summary = recommendation ?? battleDecision!;
    return (
      <main className="app-shell">
        <section className="app-card app-card-wide">
          <p className="app-kicker" style={{ marginBottom: 8 }}>
            {title} complete
          </p>
          <h1 className="app-heading">
            {selectedSensitivity === null
              ? "Too close to call"
              : `Recommended: ${formatSensitivity(selectedSensitivity)}`}
          </h1>
          <p className="app-subtext">{summary.reason}</p>
          <p
            style={{
              marginTop: 8,
              fontFamily: "monospace",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Confidence: {summary.confidence}
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
        <p className="app-kicker" style={{ marginBottom: 8 }}>
          Performance test
        </p>
        <h1 className="app-heading">{title}</h1>
        <p className="app-subtext">
          {kind === "find"
            ? "Run 25 blinded 12-second blocks: five sensitivities across Grid Rush, Multi Burst, Strafe Track, Sphere Track, and Reflex Rush. Each mode is scored on its own scale, then combined. The two tracking modes count half -- most players track moving targets poorly at any sensitivity."
            : "Run two counterbalanced 15-second Gridshot blocks. Gaps under 3 points return no winner."}
        </p>
        {kind === "battle" ? (
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <SensitivityField
              label="Candidate A"
              value={candidateA}
              onChange={setCandidateA}
            />
            <SensitivityField
              label="Candidate B"
              value={candidateB}
              onChange={setCandidateB}
            />
          </div>
        ) : null}
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

function SensitivityField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="app-field" style={{ marginBottom: 0 }}>
      <span className="app-label" style={{ display: "block" }}>
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        className="app-input"
      />
    </label>
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
