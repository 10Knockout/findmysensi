import React from "react";
import { PracticeResults } from "../../../../src/features/results/PracticeResults.jsx";

interface ResultsPageProps {
  params: Promise<{ mode: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { mode } = await params;
  return <PracticeResults mode={mode || "grid"} />;
}
