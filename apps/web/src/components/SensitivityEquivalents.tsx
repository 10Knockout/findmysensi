import React from "react";
import {
  removeBrowserInputCalibration,
  runtimeFmsToCmPer360,
} from "@findmysensi/sensitivity";

export function SensitivityEquivalents({
  sensitivity,
  dpi,
}: {
  sensitivity: number;
  dpi: number | null;
}) {
  let canonical = "Unavailable";
  let distance = "Set your mouse DPI";
  try {
    canonical = String(removeBrowserInputCalibration(sensitivity));
    const cm = runtimeFmsToCmPer360(sensitivity, dpi);
    if (cm !== null) distance = `${cm.toFixed(2)} cm / 360°`;
  } catch {
    distance = "Unavailable";
  }

  return (
    <div>
      <span className="settings-label">Estimated Turn Distance</span>
      <span
        data-testid="sensitivity-turn-distance"
        style={{
          fontFamily: "monospace",
          fontWeight: 800,
          color: "var(--fms-acid)",
        }}
      >
        {distance}
      </span>
      <span className="settings-label" style={{ marginTop: 12 }}>
        Aimlabs Default Equivalent
      </span>
      <span
        data-testid="sensitivity-aimlabs-equivalent"
        style={{ fontFamily: "monospace" }}
      >
        {canonical}
      </span>
      <p className="app-help" style={{ marginTop: 10 }}>
        In Aimlabs, use the equivalent above with the Aimlabs Default profile.
        Turn distance uses the current browser calibration estimate; measure a
        physical turn to verify it on your device.
      </p>
    </div>
  );
}
