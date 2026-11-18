"use client";

import { useEffect, useRef } from "react";
import styles from "./AimStation.module.css";

const anchors = [
  [0, 0.83],
  [0.1, 0.78],
  [0.24, 0.82],
  [0.36, 0.64],
  [0.45, 0.69],
  [0.57, 0.44],
  [0.63, 0.5],
  [0.74, 0.25],
  [0.86, 0.29],
  [0.94, 0.1],
  [1, 0.08],
] as const;

export function AimTrace() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    const field = canvas?.closest<HTMLElement>("[data-testid=hero-stage]");
    if (!canvas || !ctx || !field) return;
    const colors = getComputedStyle(canvas);
    const pear = colors.getPropertyValue("--station-pear").trim();
    const ghost = colors.getPropertyValue("--station-ghost").trim();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let x = 0;
    let y = 0;
    let nextX = 0;
    let nextY = 0;

    function draw() {
      if (!canvas || !ctx || !width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const points = anchors.map(([px, py], index) => {
        const pull = Math.max(0, 1 - Math.abs(x - px * width) / (width * 0.31));
        const shift = x ? (y - py * height) * pull * 0.19 : 0;
        return [
          px * width,
          py * height + shift + (index % 2) * height * 0.014,
        ] as const;
      });

      for (const offset of [26, 13, 0]) {
        ctx.beginPath();
        points.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(px, py + offset);
          else ctx.lineTo(px, py + offset);
        });
        ctx.strokeStyle = offset ? ghost : pear;
        ctx.globalAlpha = offset ? 0.13 : 0.82;
        ctx.lineWidth = offset ? 1 : 1.5;
        ctx.stroke();
      }
      ctx.strokeStyle = pear;
      for (const index of [3, 5, 7, 9]) {
        const [px, py] = points[index]!;
        ctx.globalAlpha = 0.85;
        ctx.strokeRect(px - 5, py - 5, 10, 10);
        ctx.globalAlpha = 0.24;
        ctx.strokeRect(px - 12, py - 12, 24, 24);
      }
      if (x) {
        ctx.globalAlpha = 0.26;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x + 8, y);
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y + 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      canvas.dataset.ready = "true";
    }

    function tick() {
      frame = 0;
      x += (nextX - x) * 0.24;
      y += (nextY - y) * 0.24;
      if (Math.abs(nextX - x) + Math.abs(nextY - y) > 0.5) {
        frame = requestAnimationFrame(tick);
      } else {
        x = nextX;
        y = nextY;
      }
      draw();
    }

    function resize() {
      if (!canvas || !ctx) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const density = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
      ctx.setTransform(density, 0, 0, density, 0, 0);
      draw();
    }

    function move(event: PointerEvent) {
      if (!canvas || motion.matches || event.pointerType === "touch") return;
      const box = canvas.getBoundingClientRect();
      nextX = Math.max(0, Math.min(width, event.clientX - box.left));
      nextY = Math.max(0, Math.min(height, event.clientY - box.top));
      if (!frame) frame = requestAnimationFrame(tick);
    }

    function reset() {
      if (frame) cancelAnimationFrame(frame);
      frame = x = y = nextX = nextY = 0;
      draw();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    field.addEventListener("pointermove", move, { passive: true });
    field.addEventListener("pointerleave", reset);
    motion.addEventListener("change", reset);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      field.removeEventListener("pointermove", move);
      field.removeEventListener("pointerleave", reset);
      motion.removeEventListener("change", reset);
    };
  }, []);

  return <canvas className={styles.trace} ref={ref} />;
}
