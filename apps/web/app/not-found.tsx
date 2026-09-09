import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell">
      <div className="app-card">
        <h1 className="app-heading">Page not found</h1>
        <p className="app-subtext">That page does not exist.</p>
        <Link href="/" className="app-button">
          Back to home
        </Link>
      </div>
    </main>
  );
}
