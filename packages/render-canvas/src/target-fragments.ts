const directions = [
  [1, 0],
  [0.5, 0.866],
  [-0.5, 0.866],
  [-1, 0],
  [-0.5, -0.866],
  [0.5, -0.866],
] as const;

export function drawTargetFragments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number,
): void {
  const baseAlpha = ctx.globalAlpha;
  const spread = radius * (0.22 + 0.96 * progress);
  const drift = radius * 0.5 * progress * progress;
  const halfLength = Math.max(1, radius * 0.13);
  const halfWidth = Math.max(0.5, radius * 0.08);

  ctx.globalAlpha = baseAlpha * (1 - progress);
  ctx.beginPath();
  for (const [dx, dy] of directions) {
    const cx = x + dx * spread;
    const cy = y + dy * spread + drift;
    const baseX = cx - dx * halfLength;
    const baseY = cy - dy * halfLength;
    ctx.moveTo(cx + dx * halfLength, cy + dy * halfLength);
    ctx.lineTo(baseX - dy * halfWidth, baseY + dx * halfWidth);
    ctx.lineTo(baseX + dy * halfWidth, baseY - dx * halfWidth);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = baseAlpha;
}
