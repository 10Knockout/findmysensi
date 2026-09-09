import { trainerModeManifest } from "../../trainer/mode-manifest.js";
import type { LeaderboardHubMode } from "./LeaderboardHub.js";

export function getLeaderboardHubModes(): LeaderboardHubMode[] {
  return Array.from(trainerModeManifest.values())
    .filter((entry) => entry.enabled)
    .map((entry) => ({
      modeId: entry.modeId,
      title: entry.scenarioEntry.presentation.title,
      scenarioVersion: entry.scenarioEntry.definition.scenarioVersion,
      scoringVersion: entry.scenarioEntry.definition.scoringVersion,
    }));
}
