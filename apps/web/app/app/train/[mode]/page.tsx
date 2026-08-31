import React from "react";
import { notFound } from "next/navigation";
import { TrainerBootstrap } from "../../../../src/trainer/TrainerBootstrap.js";

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

  return <TrainerBootstrap mode={mode} />;
}
