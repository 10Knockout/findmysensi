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
  recommendSensitivity,
  type BattleDecision,
  type CandidateResult,
  type RuntimeScoreResult,
  type SensitivityRecommendation,
} from "@findmysensi/trainer-runtime";
import { TrainerBootstrap } from "../../trainer/TrainerBootstrap.js";

const BLOCK_DURATION_TICKS = 15 * 128;

interface CalibrationBlock {
  readonly id: string;
  readonly sensitivity: number;
}

export function CalibrationFlow({ kind }: { kind: "find" | "battle" }) {
  const router = useRouter();
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<readonly CalibrationBlock[]>([]);
  const [blockIndex, setBlockIndex] = useState(0);
  const [results, setResults] = useState<readonly CandidateResult[]>([]);
  const [recommendation, setRecommendation] =
    useState<SensitivityRecommendation | null>(null);
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
      const order = buildCandidateOrder(candidates.length, seed);
      setBlocks(
        order.map((candidateIndex, index) => ({
          id: `block-${index + 1}`,
          sensitivity: candidates[candidateIndex]!,
        })),
      );
    } else {
      const a = parseSensitivity(candidateA);
      const b = parseSensitivity(candidateB);
      if (a === null || b === null || a === b) {
        setError("Enter two different positive sensitivities.");
        return;
      }
      const values = { A: a, B: b } as const;
      setBlocks(
        buildBattleOrder(seed).map((id) => ({ id, sensitivity: values[id] })),
      );
    }
    setError(null);
    setBlockIndex(0);
    setResults([]);
    setRecommendation(null);
    setBattleDecision(null);
    setSaved(false);
  };

  const completeBlock = useCallback(
    (score: RuntimeScoreResult) => {
      if (!currentBlock || !("accuracyPercentage" in score.metrics)) return;
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
      if (kind === "find") {
        setRecommendation(recommendSensitivity(nextResults));
      } else {
        const byId = new Map(
          blocks.map(
            (block, index) => [block.id, nextResults[index]!] as const,
          ),
        );
        setBattleDecision(
          decideBattle(
            {
              id: "A",
              accuracyPercentage: byId.get("A")!.accuracyPercentage,
            },
            {
              id: "B",
              accuracyPercentage: byId.get("B")!.accuracyPercentage,
            },
          ),
        );
      }
    },
    [blockIndex, blocks, currentBlock, kind, results],
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
        mode="grid"
        durationTicks={BLOCK_DURATION_TICKS}
        sensitivityOverride={formatSensitivity(currentBlock.sensitivity)}
        settingsOverride={settings}
        runLabel={`${title}: block ${blockIndex + 1} of ${blocks.length}`}
        onRunComplete={completeBlock}
        lockedConfiguration
      />
    );
  }

  if (recommendation || battleDecision) {
    const summary = recommendation ?? battleDecision!;
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
        <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
            {title} complete
          </p>
          <h1 className="mt-3 text-3xl font-black">
            {selectedSensitivity === null
              ? "Too close to call"
              : `Recommended: ${formatSensitivity(selectedSensitivity)}`}
          </h1>
          <p className="mt-3 text-zinc-400">{summary.reason}</p>
          <p className="mt-2 font-mono text-sm text-zinc-500">
            Confidence: {summary.confidence}
          </p>
          {error ? <p className="mt-4 text-red-300">{error}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {selectedSensitivity !== null ? (
              <button
                onClick={saveSelected}
                disabled={saving || saved}
                className="rounded-lg bg-emerald-400 px-5 py-3 font-bold text-zinc-950 disabled:opacity-50"
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
              className="rounded-lg border border-zinc-700 px-5 py-3 font-bold"
            >
              Run again
            </button>
            <Link href="/app" className="rounded-lg px-5 py-3 text-zinc-400">
              Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
          Performance test
        </p>
        <h1 className="mt-3 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-zinc-400">
          {kind === "find"
            ? "Run five blinded 15-second Gridshot blocks. Recommendation uses measured accuracy only."
            : "Run two counterbalanced 15-second Gridshot blocks. Gaps under 3 points return no winner."}
        </p>
        {kind === "battle" ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
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
        {error ? <p className="mt-4 text-red-300">{error}</p> : null}
        <button
          onClick={start}
          className="mt-6 w-full rounded-lg bg-emerald-400 px-5 py-3 font-black text-zinc-950"
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
    <label className="text-sm text-zinc-400">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
      />
    </label>
  );
}

function Status({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-300">
      <p>{message}</p>
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
