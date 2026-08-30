import React from "react";
import { TrainerBootstrap } from "../../../src/trainer/TrainerBootstrap.jsx";

interface TrainPageProps {
  params: Promise<{ mode: string }>;
}

export default async function TrainPage({ params }: TrainPageProps) {
  const { mode } = await params;
  return <TrainerBootstrap mode={mode || "grid"} />;
}
