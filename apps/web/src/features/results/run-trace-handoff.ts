import type { RunTrace } from "@findmysensi/trainer-runtime";

/**
 * In-memory hand-off for the just-finished run's shot trace, from the trainer
 * shell to the results screen it navigates to.
 *
 * This is a module-scoped variable, nothing more: no `localStorage`, no
 * `sessionStorage`, no run-record field, no network. It survives exactly one
 * client-side navigation (trainer -> results) and is read once. A full page
 * reload re-evaluates this module and the trace is gone -- which is the
 * intended "current run only" lifetime.
 */
let pending: RunTrace | null = null;

export function stashRunTrace(trace: RunTrace | null): void {
  pending = trace;
}

/** Returns the pending trace exactly once, then forgets it. */
export function takeRunTrace(): RunTrace | null {
  const trace = pending;
  pending = null;
  return trace;
}
