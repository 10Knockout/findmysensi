import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestTrainer } from "../../../src/trainer/GuestTrainer.js";
import { trainerModeManifest } from "../../../src/trainer/mode-manifest.js";

export const metadata: Metadata = {
  title: "Guest Practice",
  robots: { index: false, follow: true },
};

export default async function GuestPlayPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const entry = trainerModeManifest.get(mode);
  if (!entry?.enabled || !entry.createAdapter) notFound();

  return (
    <div className="site-frame guest-training">
      <GuestTrainer
        key={mode}
        mode={mode}
        title={entry.scenarioEntry.presentation.title}
      />
    </div>
  );
}
