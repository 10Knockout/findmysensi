import React from "react";
import { notFound } from "next/navigation";
import { AuthenticatedTrainer } from "../../../../src/trainer/AuthenticatedTrainer.js";

interface TrainPageProps {
  params: Promise<{
    mode: string;
  }>;
}

export default async function AppTrainPage({ params }: TrainPageProps) {
  const { mode } = await params;

  if (mode !== "grid") {
    notFound();
  }

  return <AuthenticatedTrainer mode={mode} />;
}
