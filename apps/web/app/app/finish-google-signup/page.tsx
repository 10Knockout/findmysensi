"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import { UsernameSchema } from "@findmysensi/protocol";
import { resolveSafeLoginDestination } from "../../../src/features/auth/login-next.js";

function continueToApp() {
  const next = resolveSafeLoginDestination(window.location.search);
  window.location.replace(
    next.split(/[?#]/, 1)[0] === "/app/finish-google-signup" ? "/app" : next,
  );
}

export default function FinishGoogleSignupPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void new BrowserApiClient().getGoogleSignup().then((result) => {
      if (!active) return;
      if (result.ok && result.data) {
        if (result.data.pending) setUsername(result.data.username);
        else continueToApp();
      } else if (result.status === 401 || result.status === 404) {
        window.location.replace("/login");
      } else {
        setError(
          "Could not check your sign-up. Reload this page to try again.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (username === null || !confirmed || busy) return;
    const name = UsernameSchema.safeParse(username);
    if (!name.success) {
      setError("Choose a username that follows the rules below.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await new BrowserApiClient().confirmGoogleSignup(name.data);
    if (result.ok && result.data?.pending === false) {
      continueToApp();
    } else {
      setError(
        result.status === 401
          ? "Your sign-up expired. Go back to sign in again."
          : result.status === 409
            ? "That username is already taken. Choose another."
            : "Could not finish sign-up. Try again.",
      );
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    const result = await new BrowserApiClient().logout();
    if (result.ok) window.location.replace("/");
    else {
      setError("Could not sign out. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="app-card">
        <h1 className="app-heading">Finish creating your account</h1>
        <p className="app-subtext">
          FindMySensi accounts are for people aged 18 or older. You can train as
          a guest without an account.
        </p>
        {error && (
          <p role="alert" className="app-alert">
            {error}
          </p>
        )}
        {username !== null ? (
          <form onSubmit={confirm} className="app-google-confirm">
            <div className="app-field">
              <label className="app-label" htmlFor="google-signup-username">
                Username
              </label>
              <input
                className="app-input"
                id="google-signup-username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError("");
                }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                minLength={3}
                maxLength={24}
                aria-describedby="google-signup-username-help"
                required
                disabled={busy}
              />
              <p className="app-help" id="google-signup-username-help">
                Keep the suggested name or enter your own. Use 3–24 characters
                with letters, numbers or these symbols (- _ @ ! # $ . + % &amp;
                *).
              </p>
            </div>
            <label>
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={busy}
              />{" "}
              I confirm I am 18 or older.
            </label>
            <button
              className="app-button"
              type="submit"
              disabled={!confirmed || busy}
            >
              Finish sign-up
            </button>
          </form>
        ) : (
          !error && (
            <p className="app-help" role="status">
              Checking Google sign-up…
            </p>
          )
        )}
        <button
          className="app-button app-button-ghost"
          type="button"
          onClick={cancel}
          disabled={busy}
        >
          Continue as guest
        </button>
      </section>
    </main>
  );
}
