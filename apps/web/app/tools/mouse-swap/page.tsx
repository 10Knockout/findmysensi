"use client";

import { useState } from "react";
import Link from "next/link";
import {
  calculateMouseSwap,
  type MouseSwapResult,
} from "@findmysensi/sensitivity";

export default function MouseSwapPage() {
  const [sensitivity, setSensitivity] = useState("0.4");
  const [oldDpi, setOldDpi] = useState("800");
  const [newDpi, setNewDpi] = useState("1600");

  let result: MouseSwapResult | null = null;
  let error: string | null = null;
  try {
    const s = Number(sensitivity);
    const o = Number(oldDpi);
    const n = Number(newDpi);
    if (Number.isFinite(s) && s > 0 && Number.isFinite(o) && o > 0 && n > 0) {
      result = calculateMouseSwap(
        s,
        { name: "Old Mouse", dpi: o },
        { name: "New Mouse", dpi: n },
      );
    }
  } catch {
    error = "Enter valid positive numbers.";
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-lg">
        <Link
          href="/app"
          className="text-sm font-semibold text-emerald-400 hover:underline"
        >
          ← Trainer Home
        </Link>
        <h1 className="mt-3 mb-2 text-3xl font-black text-white">Mouse Swap</h1>
        <p className="mb-8 text-sm text-zinc-500">
          Keep your physical cm/360 turning distance the same when you switch
          mice or DPI. Works for any game -- this is pure DPI math, not tied to
          a specific title&apos;s sensitivity curve.
        </p>

        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Current sensitivity
            </label>
            <input
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Old DPI
              </label>
              <input
                value={oldDpi}
                onChange={(e) => setOldDpi(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                New DPI
              </label>
              <input
                value={newDpi}
                onChange={(e) => setNewDpi(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {result !== null ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                New sensitivity
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {result.adjustedSens
                  .toFixed(6)
                  .replace(/0+$/, "")
                  .replace(/\.$/, "")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
