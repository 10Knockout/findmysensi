import Link from "next/link";

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 text-zinc-100 grid place-items-center">
      <section className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <h1 className="text-2xl font-bold text-white">Email verification</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Verification codes are entered during registration. A query-string
          token is never treated as proof of verification.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex rounded-lg bg-emerald-400 px-5 py-3 font-bold text-zinc-950"
        >
          Return to registration
        </Link>
      </section>
    </main>
  );
}
