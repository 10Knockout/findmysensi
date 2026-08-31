"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CrosshairConfig,
  CROSSHAIR_PRESETS,
  encodeCrosshairShareCode,
  decodeCrosshairShareCode,
} from "@findmysensi/crosshair";

export default function CrosshairStudioPage() {
  const [config, setConfig] = useState<CrosshairConfig>(
    CROSSHAIR_PRESETS[0]!.config,
  );
  const [shareCodeInput, setShareCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentShareCode = encodeCrosshairShareCode(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentShareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const decoded = decodeCrosshairShareCode(shareCodeInput.trim());
      setConfig(decoded);
      setShareCodeInput("");
    } catch {
      setError("Invalid crosshair share code.");
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/app"
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            ← Back to Hub
          </Link>
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
            CROSSHAIR LAB
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Crosshair Studio
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Design, preview, and generate portable share codes for pixel-perfect
            in-game crosshairs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Live Preview Area */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
              {/* Target / Background Mock */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950" />
              <div className="absolute w-32 h-32 rounded-full border border-red-500/20 bg-red-500/10 pointer-events-none" />

              {/* Crosshair Rendering */}
              <div
                className="relative z-10 pointer-events-none"
                style={{ opacity: config.opacity }}
              >
                {config.dot && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: `${config.dotSize * 2}px`,
                      height: `${config.dotSize * 2}px`,
                      backgroundColor: config.color,
                      border: config.outline
                        ? `${config.outlineThickness}px solid ${config.outlineColor}`
                        : "none",
                    }}
                  />
                )}

                {config.style === "cross" || config.style === "classic" ? (
                  <>
                    {/* Top Bar */}
                    <div
                      className="absolute -translate-x-1/2"
                      style={{
                        bottom: `${config.gap}px`,
                        width: `${config.thickness * 2}px`,
                        height: `${config.size * 2}px`,
                        backgroundColor: config.color,
                        border: config.outline
                          ? `${config.outlineThickness}px solid ${config.outlineColor}`
                          : "none",
                      }}
                    />
                    {/* Bottom Bar */}
                    <div
                      className="absolute -translate-x-1/2"
                      style={{
                        top: `${config.gap}px`,
                        width: `${config.thickness * 2}px`,
                        height: `${config.size * 2}px`,
                        backgroundColor: config.color,
                        border: config.outline
                          ? `${config.outlineThickness}px solid ${config.outlineColor}`
                          : "none",
                      }}
                    />
                    {/* Left Bar */}
                    <div
                      className="absolute -translate-y-1/2"
                      style={{
                        right: `${config.gap}px`,
                        height: `${config.thickness * 2}px`,
                        width: `${config.size * 2}px`,
                        backgroundColor: config.color,
                        border: config.outline
                          ? `${config.outlineThickness}px solid ${config.outlineColor}`
                          : "none",
                      }}
                    />
                    {/* Right Bar */}
                    <div
                      className="absolute -translate-y-1/2"
                      style={{
                        left: `${config.gap}px`,
                        height: `${config.thickness * 2}px`,
                        width: `${config.size * 2}px`,
                        backgroundColor: config.color,
                        border: config.outline
                          ? `${config.outlineThickness}px solid ${config.outlineColor}`
                          : "none",
                      }}
                    />
                  </>
                ) : null}

                {config.style === "circle" && (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: `${config.size * 4}px`,
                      height: `${config.size * 4}px`,
                      border: `${config.thickness * 2}px solid ${config.color}`,
                      backgroundColor: "transparent",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Presets Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs font-mono text-zinc-400 uppercase mb-3">
                Quick Presets
              </div>
              <div className="grid grid-cols-2 gap-2">
                {CROSSHAIR_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setConfig(p.config)}
                    className="text-left text-xs p-2 rounded bg-black/40 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-6">
                Parameters & Styling
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                      Color
                    </label>
                    <input
                      type="color"
                      value={config.color}
                      onChange={(e) =>
                        setConfig({ ...config, color: e.target.value })
                      }
                      className="w-full h-10 bg-black/60 border border-zinc-800 rounded cursor-pointer p-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                      Style
                    </label>
                    <select
                      value={config.style}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          style: e.target.value as
                            "cross" | "dot" | "circle" | "classic",
                        })
                      }
                      className="w-full px-3 py-2 bg-black/60 border border-zinc-800 rounded-lg text-white text-sm"
                    >
                      <option value="cross">Cross</option>
                      <option value="dot">Dot Only</option>
                      <option value="circle">Circle</option>
                      <option value="classic">Classic</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase mb-1">
                    <span>Length (Size)</span>
                    <span className="font-mono text-emerald-400">
                      {config.size}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={config.size}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        size: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase mb-1">
                    <span>Thickness</span>
                    <span className="font-mono text-emerald-400">
                      {config.thickness}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.thickness}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        thickness: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-zinc-400 uppercase mb-1">
                    <span>Center Gap</span>
                    <span className="font-mono text-emerald-400">
                      {config.gap}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={config.gap}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        gap: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-400 uppercase">
                    Center Dot
                  </span>
                  <input
                    type="checkbox"
                    checked={config.dot}
                    onChange={(e) =>
                      setConfig({ ...config, dot: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase">
                    Black Outline
                  </span>
                  <input
                    type="checkbox"
                    checked={config.outline}
                    onChange={(e) =>
                      setConfig({ ...config, outline: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-400"
                  />
                </div>
              </div>
            </div>

            {/* Share Code Exporter & Importer */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-4">
                Share Code
              </h2>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={currentShareCode}
                  className="w-full px-4 py-2 bg-black/60 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-300 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-lg transition-colors shrink-0"
                >
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>

              <form
                onSubmit={handleImport}
                className="pt-4 border-t border-zinc-800"
              >
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">
                  Import Share Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareCodeInput}
                    onChange={(e) => setShareCodeInput(e.target.value)}
                    placeholder="Paste FMS1-... code"
                    className="w-full px-4 py-2 bg-black/60 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0"
                  >
                    Import
                  </button>
                </div>
                {error && (
                  <div className="text-red-400 text-xs mt-2">{error}</div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
