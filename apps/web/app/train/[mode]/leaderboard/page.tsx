import { notFound, redirect } from "next/navigation";
import { isTrainerModeEnabled } from "../../../../src/trainer/mode-manifest.js";

export default async function LeaderboardRedirectPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isTrainerModeEnabled(mode)) notFound();
  redirect(`/app/train/${mode}/leaderboard`);
}
