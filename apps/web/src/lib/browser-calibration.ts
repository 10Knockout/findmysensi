import { useSyncExternalStore } from "react";
import {
  MAX_BROWSER_INPUT_CALIBRATION_SCALE,
  MIN_BROWSER_INPUT_CALIBRATION_SCALE,
} from "@findmysensi/sensitivity";

const storageKey = "fms.browser-calibration.v1";
const changeEvent = "fms:browser-calibration-change";
let unsavedScale: number | null | undefined;

function usableScale(scale: number): boolean {
  return (
    Number.isFinite(scale) &&
    scale >= MIN_BROWSER_INPUT_CALIBRATION_SCALE &&
    scale <= MAX_BROWSER_INPUT_CALIBRATION_SCALE
  );
}

export function getBrowserCalibrationScale(): number | null {
  if (typeof window === "undefined") return null;
  if (unsavedScale !== undefined) return unsavedScale;
  try {
    const scale = Number(window.localStorage.getItem(storageKey));
    return usableScale(scale) ? scale : null;
  } catch {
    return null;
  }
}

export function setBrowserCalibrationScale(scale: number | null): void {
  if (scale !== null && !usableScale(scale)) {
    throw new RangeError(
      "The browser calibration is outside the supported range.",
    );
  }
  try {
    if (scale === null) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, String(scale));
    unsavedScale = undefined;
  } catch {
    unsavedScale = scale;
  }
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(onChange: () => void): () => void {
  function onStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) onChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, onChange);
  };
}

export function useBrowserCalibrationScale(): number | null {
  return useSyncExternalStore(
    subscribe,
    getBrowserCalibrationScale,
    () => null,
  );
}
