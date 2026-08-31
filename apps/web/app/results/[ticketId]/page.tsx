import React from "react";
import { PracticeResults } from "../../../src/features/results/PracticeResults.js";

interface ResultsPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  await params;
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <PracticeResults mode="grid" />
    </main>
  );
}
