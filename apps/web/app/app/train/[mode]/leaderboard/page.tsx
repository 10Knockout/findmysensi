import { notFound } from "next/navigation";
import { ModeLeaderboard } from "../../../../../src/features/leaderboard/ModeLeaderboard.js";
import { trainerModeManifest } from "../../../../../src/trainer/mode-manifest.js";

export default async function ModeLeaderboardPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const modeEntry = trainerModeManifest.get(mode);
  if (!modeEntry?.enabled) notFound();

  const { definition } = modeEntry.scenarioEntry;
  return (
    <ModeLeaderboard
      mode={mode}
      taskName={modeEntry.scenarioEntry.presentation.title}
      scenarioVersion={definition.scenarioVersion}
      scoringVersion={definition.scoringVersion}
    />
  );
}
