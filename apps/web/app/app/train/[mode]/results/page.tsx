import { notFound } from "next/navigation";
import { AuthenticatedPracticeResults } from "../../../../../src/features/results/AuthenticatedPracticeResults.js";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (mode !== "grid") notFound();
  return <AuthenticatedPracticeResults mode={mode} />;
}
