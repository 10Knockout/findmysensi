import Link from "next/link";
import { LiveLeaderboard } from "../src/features/landing/LiveLeaderboard.js";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="font-black tracking-tight text-white">
            FindMySensi
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/login" className="rounded-lg px-4 py-2 text-zinc-300 hover:bg-zinc-900">
              Login
            </Link>
            <Link href="/register" className="rounded-lg bg-emerald-400 px-4 py-2 font-bold text-zinc-950 hover:bg-emerald-300">
              Register
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Browser aim training + sensitivity tools
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white sm:text-7xl">
            Find the sensitivity you actually perform with.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Train Gridshot in the browser, compare verified scores, and convert sensitivity using physical aim measurements such as cm/360 and eDPI.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app" className="rounded-xl bg-emerald-400 px-6 py-3 font-black text-zinc-950 hover:bg-emerald-300">
              START TRAINING
            </Link>
            <Link href="/register" className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 font-bold text-white hover:bg-zinc-800">
              CREATE ACCOUNT
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Public tool</p>
          <h2 className="mt-2 text-2xl font-black text-white">Sensitivity Converter</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Convert supported game sensitivities, see cm/360, and compare eDPI. Game conversion values are shown only when a definition is supported by the converter registry.
          </p>
          <Link href="/tools/converter" className="mt-6 inline-flex rounded-lg border border-emerald-500/40 px-4 py-2 font-bold text-emerald-300 hover:bg-emerald-950/40">
            Open Converter
          </Link>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black/20 px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">Live board</p>
            <h2 className="mt-2 text-3xl font-black text-white">Gridshot Leaderboard</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              Every training mode gets its own leaderboard. Gridshot is the only exposed mode while we perfect the first game loop.
            </p>
          </div>
          <LiveLeaderboard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Why numbers differ between games</p>
            <h2 className="mt-2 text-2xl font-black text-white">Same aim. Different sensitivity number.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              A sensitivity value such as 0.25 has meaning only inside the game or trainer that defines it. FindMySensi stores an internal angular gain and uses supported game definitions to translate it. DPI can be unknown; when DPI is known, cm/360 can also be calculated.
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Training FOV is a separate camera setting. FindMySensi defaults to 103° and lets signed-in players choose another FOV for the game they are training for.
            </p>
            <Link href="/tools/converter" className="mt-5 inline-block font-bold text-emerald-400 hover:underline">
              Calculate yours →
            </Link>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Open source</p>
            <h2 className="mt-2 text-2xl font-black text-white">Built in public, improved by players.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              FindMySensi is created by Hitesh Mahay. You can inspect the public engine, contribute code, report bugs, or suggest improvements on GitHub.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
              <a href="https://github.com/10Knockout/findmysensi" target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800">GitHub</a>
              <a href="https://github.com/10Knockout/findmysensi/issues" target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800">Report / Contribute</a>
              <a href="https://hiteshmahay.com" target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800">Portfolio</a>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
