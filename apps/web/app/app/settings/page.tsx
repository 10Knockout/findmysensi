"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Account & Practice Settings
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Manage display and simulation preferences
            </p>
          </div>
          <Link
            href="/app"
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            ← Back to Hub
          </Link>
        </div>

        {saved && (
          <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm">
            Settings saved successfully!
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6"
        >
          <div>
            <h2 className="text-base font-semibold text-white mb-1">
              Theme & Interface
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Select your preferred visual style for the trainer.
            </p>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 bg-black/50 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
            >
              <option value="dark">Dark High-Contrast (Default)</option>
              <option value="potato">Potato Low-Spec Mode</option>
            </select>
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <h2 className="text-base font-semibold text-white mb-1">
              Pointer Lock & Input
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Deterministic causal input sequencer configuration.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded bg-black border-zinc-700 text-emerald-400"
                />
                <span className="text-sm text-zinc-300">
                  Request unadjusted raw pointer movement if supported
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded bg-black border-zinc-700 text-emerald-400"
                />
                <span className="text-sm text-zinc-300">
                  Auto-pause simulation on Pointer Lock or focus loss
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-lg text-sm transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
