"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app-shell">
      <div className="app-card">
        <h1 className="app-heading">Something went wrong</h1>
        <p className="app-subtext">Try again, or head back to the homepage.</p>
        <button type="button" onClick={reset} className="app-button">
          Try again
        </button>
        <Link href="/" className="app-button app-button-ghost">
          Home
        </Link>
      </div>
    </main>
  );
}
