"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SENSITIVITY_PROFILES,
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

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-emerald-400 hover:underline"
            >
              ← FindMySensi
            </Link>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              FindMySensi Converter
            </h1>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-400">
            HIPFIRE • SAME DPI
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
          Trainer has one Aim Sensitivity. Game choices below only convert your
          existing setting into that value. FOV changes view, never mouse
          rotation.
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ConverterPanel title="Your current game">
            <Field label="Game">
              <select
                value={sourceGame}
                onChange={(event) =>
                  setSourceGame(
                    event.target.value as VerifiedSensitivityProfileId,
                  )
                }
                className={inputClass}
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
                className={inputClass}
              />
            </Field>
            <Field label="DPI / CPI">
              <input
                value={sourceDpi}
                onChange={(event) => setSourceDpi(event.target.value)}
                type="number"
                min="1"
                step="1"
                className={inputClass}
              />
            </Field>
          </ConverterPanel>

          <section
            aria-live="polite"
            className="rounded-2xl border border-emerald-500/30 bg-zinc-900 p-6"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              Your Aim Sensitivity
            </p>
            <div
              data-testid="fms-sensitivity-result"
              className="mt-3 font-mono text-5xl font-black text-emerald-400 sm:text-6xl"
            >
              {result?.formattedTargetSensitivity ?? "—"}
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              Enter this number once in FindMySensi. Every training game uses
              it. No source-game profile remains active during training. In
              Aimlabs, use that number only with its Default profile; its
              Valorant profile expects the original Valorant number.
            </p>
            <div className="mt-6 rounded-xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs text-zinc-500">Required example</div>
              <div className="mt-1 font-mono font-bold text-white">
                Valorant 0.125 = FindMySensi 0.175
              </div>
            </div>
          </section>
        </div>

        {result ? (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

            <p className="mt-5 text-xs leading-5 text-zinc-500">
              Same-DPI conversion preserves physical cm/360. eDPI is only
              meaningful inside its source game. ADS and scoped sensitivity are
              separate systems.
            </p>
          </section>
        ) : (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-200"
          >
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
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-black text-white">{title}</h2>
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
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold text-white">{value}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-black/50 px-4 py-3 text-white outline-none focus:border-emerald-400";
