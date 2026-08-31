"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  GAME_ADAPTERS,
  convertSensitivity,
  type SupportedGameId,
} from "@findmysensi/sensitivity";

const PUBLIC_GAME_IDS = [
  "valorant",
  "cs2",
] as const satisfies readonly SupportedGameId[];

export default function SensitivityConverterPage() {
  const [sourceGame, setSourceGame] = useState<SupportedGameId>("valorant");
  const [targetGame, setTargetGame] = useState<SupportedGameId>("cs2");
  const [sourceSensitivity, setSourceSensitivity] = useState("0.125");
  const [sourceDpi, setSourceDpi] = useState("800");
  const [targetDpi, setTargetDpi] = useState("800");

  const result = useMemo(() => {
    const sensitivity = Number(sourceSensitivity);
    const sourceDpiNumber = Number(sourceDpi);
    const targetDpiNumber = Number(targetDpi);
    if (
      !Number.isFinite(sensitivity) ||
      sensitivity <= 0 ||
      !Number.isFinite(sourceDpiNumber) ||
      sourceDpiNumber <= 0 ||
      !Number.isFinite(targetDpiNumber) ||
      targetDpiNumber <= 0
    ) {
      return null;
    }

    try {
      return convertSensitivity({
        sourceGame,
        targetGame,
        sourceSensitivity: sensitivity,
        sourceDpi: sourceDpiNumber,
        targetDpi: targetDpiNumber,
      });
    } catch {
      return null;
    }
  }, [sourceDpi, sourceGame, sourceSensitivity, targetDpi, targetGame]);

  const sourceEdpi = result
    ? Number(sourceSensitivity) * Number(sourceDpi)
    : null;
  const targetEdpi = result
    ? result.targetSensitivity * Number(targetDpi)
    : null;

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
              Sensitivity Converter
            </h1>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-400">
            HIPFIRE • NOMINAL DPI
          </div>
        </header>

        <div className="mb-6 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
          This first public release exposes Valorant and CS2 hipfire definitions
          only. Results use the configured yaw definitions and the DPI you
          enter. cm/360 is therefore a nominal physical calculation; ADS, scopes
          and monitor-distance matching are not included yet.
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ConverterPanel title="From">
            <Field label="Game">
              <select
                value={sourceGame}
                onChange={(event) =>
                  setSourceGame(event.target.value as SupportedGameId)
                }
                className={inputClass}
              >
                {PUBLIC_GAME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {GAME_ADAPTERS[id].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sensitivity">
              <input
                value={sourceSensitivity}
                onChange={(event) => setSourceSensitivity(event.target.value)}
                type="number"
                min="0.0001"
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

          <ConverterPanel title="To">
            <Field label="Game">
              <select
                value={targetGame}
                onChange={(event) =>
                  setTargetGame(event.target.value as SupportedGameId)
                }
                className={inputClass}
              >
                {PUBLIC_GAME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {GAME_ADAPTERS[id].name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target DPI / CPI">
              <input
                value={targetDpi}
                onChange={(event) => setTargetDpi(event.target.value)}
                type="number"
                min="1"
                step="1"
                className={inputClass}
              />
            </Field>
            <button
              type="button"
              onClick={() => setTargetDpi(sourceDpi)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-left text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Use same DPI as source
            </button>
          </ConverterPanel>
        </div>

        {result ? (
          <section className="mt-6 rounded-2xl border border-emerald-500/30 bg-zinc-900 p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              Converted {GAME_ADAPTERS[targetGame].name} sensitivity
            </p>
            <div className="mt-2 font-mono text-5xl font-black text-emerald-400 sm:text-6xl">
              {result.formattedTargetSensitivity}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <Metric
                label="cm / 360"
                value={`${result.formattedCmPer360} cm`}
              />
              <Metric
                label={`${GAME_ADAPTERS[sourceGame].name} eDPI`}
                value={sourceEdpi?.toFixed(2) ?? "—"}
              />
              <Metric
                label={`${GAME_ADAPTERS[targetGame].name} eDPI`}
                value={targetEdpi?.toFixed(2) ?? "—"}
              />
            </div>

            <p className="mt-5 text-xs leading-5 text-zinc-500">
              eDPI is sensitivity × DPI and is useful inside a single game. Do
              not compare eDPI numbers across games as though they share the
              same sensitivity scale. FOV is a separate camera setting and is
              not silently used to rewrite this hipfire cm/360 conversion.
            </p>
          </section>
        ) : (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-200"
          >
            Enter positive sensitivity and DPI values to calculate a conversion.
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
