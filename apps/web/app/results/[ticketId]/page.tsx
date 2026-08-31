interface ResultsPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { ticketId } = await params;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-lg p-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Practice Complete</h1>
        <p className="text-zinc-400 mb-8 font-mono text-sm">TICKET: {ticketId}</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/50 p-4 rounded border border-zinc-800/50">
            <div className="text-zinc-500 text-xs font-semibold mb-1">SCORE</div>
            <div className="text-2xl font-mono text-white">0</div>
          </div>
          <div className="bg-black/50 p-4 rounded border border-zinc-800/50">
            <div className="text-zinc-500 text-xs font-semibold mb-1">HITS</div>
            <div className="text-2xl font-mono text-white">0</div>
          </div>
          <div className="bg-black/50 p-4 rounded border border-zinc-800/50">
            <div className="text-zinc-500 text-xs font-semibold mb-1">MISSES</div>
            <div className="text-2xl font-mono text-white">0</div>
          </div>
          <div className="bg-black/50 p-4 rounded border border-zinc-800/50">
            <div className="text-zinc-500 text-xs font-semibold mb-1">ACCURACY</div>
            <div className="text-2xl font-mono text-white">0%</div>
          </div>
        </div>

        <div className="flex gap-4">
          <a href="/train/grid" className="bg-white text-black px-6 py-2 rounded font-medium hover:bg-zinc-200 transition-colors">
            Play Again
          </a>
          <a href="/" className="bg-zinc-800 text-white px-6 py-2 rounded font-medium hover:bg-zinc-700 transition-colors">
            Return Home
          </a>
        </div>
      </div>
    </main>
  );
}
