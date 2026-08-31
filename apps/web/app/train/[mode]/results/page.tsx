import { notFound, redirect } from "next/navigation";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (mode !== "grid") notFound();
  redirect(`/app/train/${mode}/results`);
}
