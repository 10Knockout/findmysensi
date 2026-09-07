import { notFound } from "next/navigation";
import { AuthenticatedPracticeResults } from "../../../../../src/features/results/AuthenticatedPracticeResults.js";
import { trainerModeManifest } from "../../../../../src/trainer/mode-manifest.js";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const modeEntry = trainerModeManifest.get(mode);
  if (!modeEntry?.enabled) notFound();
  return (
    <AuthenticatedPracticeResults
      mode={mode}
      taskName={modeEntry.scenarioEntry.presentation.title}
    />
  );
}
