import { notFound } from "next/navigation";
import { AuthenticatedPracticeResults } from "../../../../../src/features/results/AuthenticatedPracticeResults.js";
import { isTrainerModeEnabled } from "../../../../../src/trainer/mode-manifest.js";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isTrainerModeEnabled(mode)) notFound();
  return <AuthenticatedPracticeResults mode={mode} />;
}
