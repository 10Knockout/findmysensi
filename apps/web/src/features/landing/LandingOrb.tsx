"use client";

import { useEffect, useRef } from "react";

const dotCount = 320;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const dots = Array.from({ length: dotCount }, (_, index) => {
  const y = 1 - (2 * (index + 0.5)) / dotCount;
  const radius = Math.sqrt(1 - y * y);
  const angle = index * goldenAngle;
  return { x: radius * Math.cos(angle), y, z: radius * Math.sin(angle) };
});

export function LandingOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !hero || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let frame = 0;
    let lastPaint = 0;
    let width = 0;
    let height = 0;
    let targetX = 0;
    let targetY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let scrollTilt = 0;

    function draw(time: number) {
      if (!ctx || width <= 0 || height <= 0) return;
      ctx.clearRect(0, 0, width, height);
      const radius = Math.min(width, height) * 0.41;
      const cx = width * 0.51;
      const cy = height * 0.5;
      tiltX += (targetX - tiltX) * 0.08;
      tiltY += (targetY - tiltY) * 0.08;
      const yaw = reducedMotion.matches ? 0.3 : time * 0.00012 + tiltX;
      const pitch = reducedMotion.matches ? -0.25 : tiltY + scrollTilt - 0.25;
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      for (const point of dots) {
        const x = point.x * cosYaw - point.z * sinYaw;
        const z = point.x * sinYaw + point.z * cosYaw;
        const y = point.y * cosPitch - z * sinPitch;
        const depth = (point.y * sinPitch + z * cosPitch + 1) / 2;
        const perspective = 0.8 + depth * 0.2;
        const size = 0.65 + depth * 1.25;
        ctx.fillStyle = depth > 0.63 ? "#ffd4b6" : "#f17740";
        ctx.globalAlpha = 0.1 + depth * 0.8;
        ctx.beginPath();
        ctx.arc(
          cx + x * radius * perspective,
          cy + y * radius * perspective,
          size,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function schedule() {
      if (!frame && visible && !document.hidden && !reducedMotion.matches) {
        frame = requestAnimationFrame(animate);
      }
    }

    function animate(time: number) {
      frame = 0;
      if (!visible || document.hidden || reducedMotion.matches) return;
      if (time - lastPaint >= 32) {
        lastPaint = time;
        draw(time);
      }
      schedule();
    }

    function resize() {
      if (!canvas || !ctx) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }

    function move(event: PointerEvent) {
      if (!hero || reducedMotion.matches) return;
      const rect = hero.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 1.25;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.8;
    }

    function leave() {
      targetX = 0;
      targetY = 0;
    }

    function scroll() {
      scrollTilt = Math.min(0.7, Math.max(0, window.scrollY * 0.001));
    }

    function refresh() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (reducedMotion.matches && visible) draw(0);
      schedule();
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      refresh();
    });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerdown", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", refresh);
    reducedMotion.addEventListener("change", refresh);
    resize();
    schedule();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerdown", move);
      hero.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", refresh);
      reducedMotion.removeEventListener("change", refresh);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-orb" aria-hidden="true" />;
}
