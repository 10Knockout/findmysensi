import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 text-zinc-100 grid place-items-center">
      <section className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-7 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400 text-2xl font-black text-zinc-950">
          S
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
          FindMySensi
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
          Sign in or create an account to play the Gridshot practice trainer.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-emerald-400 px-7 py-3.5 font-bold text-zinc-950 hover:bg-emerald-300"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-7 py-3.5 font-bold text-white hover:bg-zinc-800"
          >
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}
