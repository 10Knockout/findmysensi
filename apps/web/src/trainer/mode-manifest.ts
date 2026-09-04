import { defaultScenarioRegistry, ScenarioEntry } from "@findmysensi/scenarios";
import {
  createGridModeAdapter,
  createHeadlineModeAdapter,
  createMultiModeAdapter,
  createMicroshotModeAdapter,
  createPinpointModeAdapter,
  createReactionModeAdapter,
  createSmoothTrackModeAdapter,
  createStrafeModeAdapter,
  createSwitchTrackModeAdapter,
  createTempoModeAdapter,
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
  ["pinpoint", buildEntry("pinpoint", true, createPinpointModeAdapter)],
  ["multi", buildEntry("multi", true, createMultiModeAdapter)],
  ["headline", buildEntry("headline", true, createHeadlineModeAdapter)],
  ["strafe", buildEntry("strafe", true, createStrafeModeAdapter)],
  [
    "smooth-track",
    buildEntry("smooth-track", true, createSmoothTrackModeAdapter),
  ],
  ["tempo", buildEntry("tempo", true, createTempoModeAdapter)],
  ["microshot", buildEntry("microshot", true, createMicroshotModeAdapter)],
  ["reaction", buildEntry("reaction", true, createReactionModeAdapter)],
  [
    "switch-track",
    buildEntry("switch-track", true, createSwitchTrackModeAdapter),
  ],
]);

export function isTrainerModeEnabled(modeId: string): boolean {
  return trainerModeManifest.get(modeId)?.enabled ?? false;
}
