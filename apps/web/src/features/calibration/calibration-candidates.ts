const MIN_SENSITIVITY = 0.000001;
const MAX_SENSITIVITY = 100;

export function parseCalibrationSensitivity(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  if (number < MIN_SENSITIVITY || number > MAX_SENSITIVITY) return null;
  return roundSensitivity(number);
}

function roundSensitivity(sensitivity: number): number {
  return Number(sensitivity.toFixed(6));
}

export function discoveryCandidates(base: number): number[] {
  const candidates = [0.8, 0.9, 1, 1.1, 1.2].map((ratio) =>
    roundSensitivity(
      Math.min(MAX_SENSITIVITY, Math.max(MIN_SENSITIVITY, base * ratio)),
    ),
  );
  return Array.from(new Set(candidates));
}

export function refinementCandidates(best: number): number[] {
  const step = 0.01;
  const offsets =
    best <= step
      ? [0, step, 2 * step]
      : best > MAX_SENSITIVITY - step
        ? [-2 * step, -step, 0]
        : [-step, 0, step];
  return offsets.map((offset) => roundSensitivity(best + offset));
}
