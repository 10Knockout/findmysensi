import { defaultScenarioRegistry, ScenarioEntry } from "@findmysensi/scenarios";
import {
  createGridModeAdapter,
  ModeRuntimeAdapter,
} from "@findmysensi/trainer-runtime";

export interface TrainerModeManifestEntry {
  readonly modeId: string;
  readonly enabled: boolean;
  readonly scenarioEntry: ScenarioEntry;
  readonly createAdapter?: () => ModeRuntimeAdapter;
}

function buildEntry(
  modeId: string,
  enabled: boolean,
  createAdapter?: () => ModeRuntimeAdapter,
): TrainerModeManifestEntry {
  const scenarioEntry = defaultScenarioRegistry.get(modeId, 0);
  if (!scenarioEntry) {
    throw new Error(
      `Trainer mode manifest: no scenario registered for "${modeId}" at version 0.`,
    );
  }
  return {
    modeId,
    enabled,
    scenarioEntry,
    ...(createAdapter ? { createAdapter } : {}),
  };
}

export const trainerModeManifest: ReadonlyMap<
  string,
  TrainerModeManifestEntry
> = new Map([
  ["grid", buildEntry("grid", true, createGridModeAdapter)],
  ["pinpoint", buildEntry("pinpoint", false)],
  ["multi", buildEntry("multi", false)],
  ["headline", buildEntry("headline", false)],
  ["strafe", buildEntry("strafe", false)],
  ["smooth-track", buildEntry("smooth-track", false)],
  ["tempo", buildEntry("tempo", false)],
]);

export function isTrainerModeEnabled(modeId: string): boolean {
  return trainerModeManifest.get(modeId)?.enabled ?? false;
}
