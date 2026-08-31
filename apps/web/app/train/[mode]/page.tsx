import { notFound } from "next/navigation";
import { redirect } from "next/navigation";

interface TrainPageProps {
  params: Promise<{
    mode: string;
  }>;
}

export default async function TrainPage({ params }: TrainPageProps) {
  const { mode } = await params;

  if (mode !== "grid") {
    notFound();
  }

  redirect(`/app/train/${mode}`);
}
