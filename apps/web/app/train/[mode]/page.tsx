import { notFound, redirect } from "next/navigation";
import { isTrainerModeEnabled } from "../../../src/trainer/mode-manifest.js";

interface TrainPageProps {
  params: Promise<{
    mode: string;
  }>;
}

export default async function TrainPage({ params }: TrainPageProps) {
  const { mode } = await params;

  if (!isTrainerModeEnabled(mode)) {
    notFound();
  }

  redirect(`/app/train/${mode}`);
}
