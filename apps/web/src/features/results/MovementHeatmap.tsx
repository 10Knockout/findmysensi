"use client";

import { useEffect, useRef } from "react";
import type { MovementAnalysis } from "./movement-analysis.js";

const SIZE = 220;
const RADII_SPAN = 3; // plot covers +/- 3 target radii

export function MovementHeatmap({
  analysis,
}: {
  readonly analysis: MovementAnalysis;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const toPx = (v: number) => SIZE / 2 + (v / RADII_SPAN) * (SIZE / 2);

    // target ring at radius 1
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, (1 / RADII_SPAN) * (SIZE / 2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(SIZE / 2, 0);
    ctx.lineTo(SIZE / 2, SIZE);
    ctx.moveTo(0, SIZE / 2);
    ctx.lineTo(SIZE, SIZE / 2);
    ctx.stroke();

    for (const p of analysis.points) {
      ctx.fillStyle = p.hit ? "rgba(163,230,53,0.85)" : "rgba(244,63,94,0.8)";
      ctx.beginPath();
      ctx.arc(toPx(p.dx), toPx(p.dy), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [analysis]);

  const missCount =
    analysis.missTally.left +
    analysis.missTally.right +
    analysis.missTally.up +
    analysis.missTally.down +
    analysis.missTally.unclear;

  return (
    <figure className="results-heatmap">
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE }}
        aria-label="Shot placement relative to target centre"
      />
      <figcaption className="app-subtext">
        {missCount === 0
          ? "No misses this run."
          : `Misses lean ${dominantDirection(analysis.missTally)}. Mean miss ${analysis.meanMissDistanceRadii.toFixed(2)} radii, ${Math.round(analysis.overflickRatio * 100)}% overflick.`}
      </figcaption>
    </figure>
  );
}

function dominantDirection(t: MovementAnalysis["missTally"]): string {
  const entries = Object.entries(t).filter(([k]) => k !== "unclear") as [
    string,
    number,
  ][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0] && entries[0][1] > 0 ? entries[0][0] : "evenly";
}
