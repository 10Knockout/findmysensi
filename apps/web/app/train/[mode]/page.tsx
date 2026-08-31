import { notFound } from "next/navigation";

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

  return (
    <main className="w-full h-screen bg-black overflow-hidden relative touch-none select-none">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p className="text-zinc-600 font-mono text-sm tracking-widest animate-pulse">
          AWAITING POINTER LOCK
        </p>
      </div>
      <canvas id="simulation-canvas" className="w-full h-full cursor-crosshair block" />
    </main>
  );
}
