"use client";

import React, { useState } from "react";
import {
  CROSSHAIR_PRESETS,
  decodeCrosshairShareCode,
  encodeCrosshairShareCode,
  type CrosshairConfig,
} from "@findmysensi/crosshair";

interface InteractiveCrosshairEditorProps {
  crosshair: CrosshairConfig;
  onChange: (updated: CrosshairConfig) => void;
  compact?: boolean;
}

const COLOR_SWATCHES = [
  { name: "Cyan", hex: "#00f0ff" },
  { name: "Emerald", hex: "#00ff88" },
  { name: "Yellow", hex: "#ffff00" },
  { name: "Red", hex: "#ff3366" },
  { name: "White", hex: "#ffffff" },
  { name: "Purple", hex: "#b026ff" },
];

export function InteractiveCrosshairEditor({
  crosshair,
  onChange,
  compact = false,
}: InteractiveCrosshairEditorProps) {
  const [shareCodeInput, setShareCodeInput] = useState("");
  const [codeMessage, setCodeMessage] = useState<string | null>(null);

  const update = <K extends keyof CrosshairConfig>(
    key: K,
    val: CrosshairConfig[K],
  ) => {
    onChange({ ...crosshair, [key]: val });
  };

  const handleImportCode = () => {
    try {
      const decoded = decodeCrosshairShareCode(shareCodeInput.trim());
      onChange(decoded);
      setCodeMessage("Imported successfully!");
      setShareCodeInput("");
    } catch {
      setCodeMessage("Invalid crosshair code.");
    }
  };

  const handleCopyCode = async () => {
    try {
      const code = encodeCrosshairShareCode(crosshair);
      await navigator.clipboard.writeText(code);
      setCodeMessage("Copied to clipboard!");
    } catch {
      setCodeMessage("Failed to copy.");
    }
  };

  return (
    <div className={`grid gap-6 ${compact ? "grid-cols-1" : "lg:grid-cols-[260px_1fr]"}`}>
      {/* Live Preview Box */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/90 shadow-inner">
          {/* Subtle aimlab-style target background mockup */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute h-16 w-16 rounded-full border border-zinc-800/60 bg-zinc-900/40" />

          {/* Crosshair render */}
          <CrosshairVisual config={crosshair} />
        </div>

        {/* Share / Import Code Bar */}
        <div className="w-full max-w-[260px] space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste code"
              value={shareCodeInput}
              onChange={(e) => {
                setShareCodeInput(e.target.value);
                setCodeMessage(null);
              }}
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleImportCode}
              disabled={!shareCodeInput.trim()}
              className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
            >
              Import
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="rounded-lg bg-cyan-500/20 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
              title="Copy current crosshair code"
            >
              Copy
            </button>
          </div>
          {codeMessage ? (
            <p className="text-center text-[11px] text-zinc-400">{codeMessage}</p>
          ) : null}
        </div>
      </div>

      {/* Crosshair Controls */}
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Preset
            </label>
            <select
              onChange={(e) => {
                const found = CROSSHAIR_PRESETS.find((p) => p.id === e.target.value);
                if (found) onChange(found.config);
              }}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="">Custom Crosshair</option>
              {CROSSHAIR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Style
            </label>
            <select
              value={crosshair.style}
              onChange={(e) =>
                update("style", e.target.value as CrosshairConfig["style"])
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="cross">Cross</option>
              <option value="classic">Classic Static</option>
              <option value="dot">Center Dot Only</option>
              <option value="circle">Circle</option>
            </select>
          </div>
        </div>

        {/* Color Palette & Picker */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Crosshair Color
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.hex}
                type="button"
                onClick={() => update("color", swatch.hex)}
                className={`h-7 w-7 rounded-lg border transition-all ${
                  crosshair.color.toLowerCase() === swatch.hex.toLowerCase()
                    ? "border-white scale-110 shadow-lg"
                    : "border-zinc-700 hover:scale-105"
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name}
              />
            ))}
            <input
              type="color"
              value={crosshair.color}
              onChange={(e) => update("color", e.target.value)}
              className="h-7 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-black p-0.5"
              title="Custom Hex Color"
            />
            <span className="font-mono text-xs text-zinc-400 uppercase">
              {crosshair.color}
            </span>
          </div>
        </div>

        {/* Numeric Sliders */}
        <div className="grid gap-3 sm:grid-cols-2">
          {crosshair.style !== "dot" ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-400">
                <span>Length / Size</span>
                <span className="font-mono text-cyan-400">{crosshair.size}</span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                value={crosshair.size}
                onChange={(e) => update("size", Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>Thickness</span>
              <span className="font-mono text-cyan-400">
                {crosshair.thickness}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={crosshair.thickness}
              onChange={(e) => update("thickness", Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          {crosshair.style !== "dot" ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-400">
                <span>Center Gap</span>
                <span className="font-mono text-cyan-400">{crosshair.gap}</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={crosshair.gap}
                onChange={(e) => update("gap", Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>Opacity</span>
              <span className="font-mono text-cyan-400">
                {Math.round(crosshair.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={crosshair.opacity}
              onChange={(e) => update("opacity", Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>

        {/* Center Dot Controls */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={crosshair.dot}
                onChange={(e) => update("dot", e.target.checked)}
                className="accent-cyan-400"
              />
              Center Dot
            </label>
            {crosshair.dot ? (
              <span className="font-mono text-xs text-cyan-400">
                {crosshair.dotSize}px
              </span>
            ) : null}
          </div>
          {crosshair.dot ? (
            <div className="mt-2">
              <input
                type="range"
                min={1}
                max={8}
                value={crosshair.dotSize}
                onChange={(e) => update("dotSize", Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          ) : null}
        </div>

        {/* Outline Controls */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={crosshair.outline}
                onChange={(e) => update("outline", e.target.checked)}
                className="accent-cyan-400"
              />
              Black Outline
            </label>
            {crosshair.outline ? (
              <span className="font-mono text-xs text-cyan-400">
                {crosshair.outlineThickness}px
              </span>
            ) : null}
          </div>
          {crosshair.outline ? (
            <div className="mt-2">
              <input
                type="range"
                min={1}
                max={4}
                value={crosshair.outlineThickness}
                onChange={(e) =>
                  update("outlineThickness", Number(e.target.value))
                }
                className="w-full accent-cyan-400"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CrosshairVisual({ config }: { config: CrosshairConfig }) {
  const outlinePx = config.outline ? config.outlineThickness : 0;
  const outlineStyle = outlinePx > 0 ? `${outlinePx}px solid #000000` : "none";

  const bar = (style: React.CSSProperties) => (
    <span
      className="absolute block"
      style={{
        backgroundColor: config.color,
        border: outlineStyle,
        ...style,
      }}
    />
  );

  return (
    <div
      className="relative pointer-events-none"
      style={{ opacity: config.opacity }}
    >
      {config.dot ? (
        <span
          className="absolute rounded-full"
          style={{
            width: config.dotSize * 2,
            height: config.dotSize * 2,
            backgroundColor: config.color,
            border: outlineStyle,
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}

      {config.style === "cross" || config.style === "classic" ? (
        <>
          {/* Top Bar */}
          {bar({
            width: config.thickness * 2,
            height: config.size * 2,
            left: -config.thickness,
            bottom: config.gap,
          })}
          {/* Bottom Bar */}
          {bar({
            width: config.thickness * 2,
            height: config.size * 2,
            left: -config.thickness,
            top: config.gap,
          })}
          {/* Left Bar */}
          {bar({
            width: config.size * 2,
            height: config.thickness * 2,
            right: config.gap,
            top: -config.thickness,
          })}
          {/* Right Bar */}
          {bar({
            width: config.size * 2,
            height: config.thickness * 2,
            left: config.gap,
            top: -config.thickness,
          })}
        </>
      ) : null}

      {config.style === "circle" ? (
        <span
          className="absolute rounded-full"
          style={{
            width: config.size * 4,
            height: config.size * 4,
            border: `${config.thickness * 2}px solid ${config.color}`,
            outline: outlineStyle,
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}
    </div>
  );
}
