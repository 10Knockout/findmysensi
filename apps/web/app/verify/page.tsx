import Link from "next/link";

export default function VerifyPage() {
  return (
    <main className="app-shell">
      <section className="app-card" style={{ textAlign: "center" }}>
        <h1 className="app-heading">Email verification</h1>
        <p className="app-subtext">
          Verification codes are entered during registration. A query-string
          token is never treated as proof of verification.
        </p>
        <Link
          href="/register"
          className="app-button"
          style={{ marginTop: 22 }}
        >
          Return to registration
        </Link>
      </section>
    </main>
  );
}
