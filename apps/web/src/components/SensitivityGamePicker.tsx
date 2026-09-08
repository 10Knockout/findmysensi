import React from "react";
import {
  SENSITIVITY_PROFILES,
  VERIFIED_SENSITIVITY_PROFILE_IDS,
  type VerifiedSensitivityProfileId,
} from "@findmysensi/sensitivity";

interface SensitivityGamePickerProps {
  readonly legend: string;
  readonly selected: VerifiedSensitivityProfileId;
  readonly onSelect: (gameId: VerifiedSensitivityProfileId) => void;
}

export function SensitivityGamePicker({
  legend,
  selected,
  onSelect,
}: SensitivityGamePickerProps) {
  return (
    <fieldset className="app-field" style={{ border: 0, padding: 0 }}>
      <legend className="settings-label">{legend}</legend>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 8,
        }}
      >
        {VERIFIED_SENSITIVITY_PROFILE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={selected === id}
            onClick={() => onSelect(id)}
            className={`settings-chip${selected === id ? " settings-chip-active" : ""}`}
            style={{ textAlign: "center" }}
          >
            {gameShortName(id)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function gameShortName(id: VerifiedSensitivityProfileId): string {
  if (id === "aimlab-default") return "Aimlabs";
  if (id === "cs2") return "CS2";
  if (id === "apex") return "Apex";
  return SENSITIVITY_PROFILES[id].name;
}
