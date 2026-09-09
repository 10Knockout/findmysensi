# Practice Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every synced practice run appear on a per-mode public leaderboard with a visible rank and score, and remove the unused Ranked / verified concept from user-facing surfaces.

**Architecture:** Approach A from the spec — the V2 read path (`getLeaderboardV2`) already returns ranked rows + the caller's personal `standing` + percentile. The only missing server piece is a _writer_: `savePracticeRunV2` gains a best-score-wins upsert into `leaderboard_entry_v2` (no verification, no publication opt-in). The submit route already reads `standing` back and the results screen already renders it, so the rank appears as soon as the writer exists. Web adds a per-mode leaderboard page and repoints the homepage widget from the dead V1 path to V2.

**Tech Stack:** TypeScript, Drizzle ORM (libSQL/Turso), Zod, Next.js App Router (React), Vitest. Two repos: `findmysensi` (public: `apps/web`, `packages/protocol`, `packages/api-client`) and `findmysensi-secure` (private: `apps/api`, `packages/database`, `packages/public-runtime`).

**Spec:** `docs/superpowers/specs/2026-09-09-practice-leaderboard-design.md` (in the `findmysensi` repo)

## Global Constraints

- **Board id format:** `` `${modeId}:scenario-${scenarioVersion}:scoring-${scoringVersion}` `` — never reformat. All 12 modes are at `scenarioVersion 0`, `scoringVersion 0` today.
- **Trust model:** full trust. The server stores the client's reported `finalScore`. No rate limiting, no anomaly detection.
- **Only guard (D1):** skip the board upsert when `clientEligibility.leaderboardEligible === false`. The `run_record_v2` row is still written.
- **No schema migration.** `leaderboard_entry_v2` already has every column the writer needs (`id, boardId, modeId, scenarioVersion, scoringVersion, userId, runRecordId, score, achievedAt, updatedAt`). `leaderboard_publication_v2` stays in the schema, unused. Confirm no Drizzle delta with `npm run -w @findmysensi-secure/database db:generate` producing no new file.
- **Percentile floor:** `LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2 = 10` (unchanged). Percentile is `null` below this.
- **Response literal (D3):** `PracticeRunSubmissionResponseV2Schema.competitiveStatus` becomes the transitional `z.enum(["practice-only", "listed"])` in this plan. The API sends `"listed"`. A later follow-up (out of scope here) narrows the enum to `z.literal("listed")`.
- **No backfill (D4).** Existing `run_record_v2` rows are not swept into `leaderboard_entry_v2`.
- **Node:** `>=22`. **Commit style:** conventional commits; scope `leaderboard` or the package name.
- **Both repos are already on branch `feat/practice-leaderboard`.**
- Web `vitest` runs in `environment: "node"` — there is **no jsdom / React Testing Library**. Component tests are either (a) pure view-model functions tested directly, or (b) source-string assertions reading the `.tsx` as text (see `apps/web/src/features/results/practice-results.spec.ts`). Follow that pattern; do not add a DOM renderer.

---

## File Structure

### findmysensi-secure

| File                                    | Responsibility                                         | Change                                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/database/src/run-v2.ts`       | V2 run storage + leaderboard reads                     | Add `leaderboardEligible` to `StoredRunInputV2`; wrap `savePracticeRunV2` in a transaction; add best-score-wins upsert into `leaderboardEntryV2` unless ineligible |
| `packages/database/test/run-v2.spec.ts` | DB-layer tests                                         | Replace the "never writes a practice submission to the verified board" test; add board-writer coverage                                                             |
| `apps/api/src/run-v2.ts`                | HTTP route for `/api/v2/runs` + `/api/v2/leaderboards` | Pass `leaderboardEligible` into `savePracticeRunV2`; response literal `"practice-only"` -> `"listed"`                                                              |
| `apps/api/src/run-v2.spec.ts`           | Route tests                                            | Update the stored-response assertion to `"listed"`; assert `savePracticeRunV2` receives `leaderboardEligible`                                                      |

### findmysensi

| File                                                            | Responsibility                                                                                                              | Change                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `packages/protocol/src/v2/run-submission.ts`                    | Wire schemas                                                                                                                | `competitiveStatus` literal -> transitional `z.enum(["practice-only", "listed"])`                |
| `packages/protocol/test/run-submission-v2.spec.ts`              | Schema tests                                                                                                                | Accept `"listed"`; keep `"practice-only"` accepted during transition                             |
| `packages/api-client/test/run-v2.spec.ts`                       | Client tests                                                                                                                | Response fixture + assertion -> `"listed"`                                                       |
| `apps/web/src/features/results/results-overview.ts`             | Results view-model                                                                                                          | Reword the two leaderboard-metric notes + the score-delta note; no branching-logic change        |
| `apps/web/src/features/results/results-overview.spec.ts`        | View-model tests                                                                                                            | Update expected note strings; keep the populated-`standing` case                                 |
| `apps/web/src/features/results/PracticeResults.tsx`             | Results screen                                                                                                              | `getRunSyncCopy("saved")` copy; eligibility note copy; add a "View leaderboard" action link      |
| `apps/web/src/features/results/practice-results.spec.ts`        | Copy-integrity test                                                                                                         | Update the asserted copy strings                                                                 |
| `apps/web/src/features/leaderboard/mode-leaderboard.ts`         | **New.** Pure view-model: turn a `LeaderboardResponseV2` + optional self username into rendered rows + a self-standing line | Create                                                                                           |
| `apps/web/src/features/leaderboard/mode-leaderboard.spec.ts`    | **New.** View-model tests                                                                                                   | Create                                                                                           |
| `apps/web/src/features/leaderboard/routes.ts`                   | **New.** `getModeLeaderboardRoutes(mode)`                                                                                   | Create                                                                                           |
| `apps/web/src/features/leaderboard/routes.spec.ts`              | **New.** Routes test                                                                                                        | Create                                                                                           |
| `apps/web/src/features/leaderboard/ModeLeaderboard.tsx`         | **New.** Client component: fetch + states + table, delegates shaping to `mode-leaderboard.ts`                               | Create                                                                                           |
| `apps/web/app/app/train/[mode]/leaderboard/page.tsx`            | **New.** Server route: resolve mode, 404, render `<ModeLeaderboard>`                                                        | Create                                                                                           |
| `apps/web/app/train/[mode]/leaderboard/page.tsx`                | **New.** Redirect stub -> `/app/train/[mode]/leaderboard`                                                                   | Create                                                                                           |
| `apps/web/app/globals.css`                                      | Global styles                                                                                                               | Add `.app-leaderboard-*` rules                                                                   |
| `apps/web/src/features/landing/LiveLeaderboard.tsx`             | Homepage widget                                                                                                             | Repoint `getLeaderboard("gridshot")` -> `getLeaderboardV2("grid", 0, 0)`; adapt row shape + copy |
| `apps/web/app/page.tsx`                                         | Landing page                                                                                                                | Reword the section-03 "public board stays empty" copy                                            |
| `apps/web/app/app/page.tsx`                                     | Trainer hub                                                                                                                 | Reword "Results stay local until verified scoring is enabled."                                   |
| `docs/adr/0001-repository-and-trust-boundary.md`                | ADR                                                                                                                         | Note practice runs now populate the public board directly                                        |
| `docs/protocol/v2/runs.md`, `docs/protocol/v2/compatibility.md` | Protocol docs                                                                                                               | Rewrite the "no public route may create a leaderboard row" language                              |

---

## Task 1: Board-entry writer in `savePracticeRunV2` (findmysensi-secure)

**Files:**

- Modify: `packages/database/src/run-v2.ts`
- Test: `packages/database/test/run-v2.spec.ts`

**Interfaces:**

- Consumes: existing `db` (drizzle), `leaderboardEntryV2`, `runRecordV2` from `./schema.js`; `and, eq, sql` from `drizzle-orm`; `randomUUID` from `node:crypto` (all already imported in `run-v2.ts`).
- Produces:
  - `StoredRunInputV2` gains `readonly leaderboardEligible: boolean;`
  - `savePracticeRunV2(input: StoredRunInputV2): Promise<SavePracticeRunResultV2>` — unchanged signature/return (`{ id, status }`), new side effect: upserts one `leaderboard_entry_v2` row when `input.leaderboardEligible === true`.
  - `createBoardIdV2(modeId, scenarioVersion, scoringVersion): string` — already exported, reused.

- [ ] **Step 1: Add `leaderboardEligible` to the `storedRun` test helper**

In `packages/database/test/run-v2.spec.ts`, in `function storedRun(...)` (around line 106), add to the returned object literal, immediately before `...overrides`:

```ts
    leaderboardEligible: true,
```

- [ ] **Step 2: Write the failing tests**

In `packages/database/test/run-v2.spec.ts`, delete the whole test
`it("never writes a practice submission to the verified board", async () => { ... });`
(currently lines ~175-183, inside `describe("Protocol V2 private run storage", ...)`), and add these tests in its place:

```ts
it("lists a practice run on the public board, best-score-wins", async () => {
  const userId = await seedUser("practice-board-write");
  await savePracticeRunV2(storedRun(userId, "board-run-1", 1_000));

  let board = await getLeaderboardV2("grid", 0, 0, userId);
  expect(board.rows).toHaveLength(1);
  expect(board.rows[0]?.score).toBe(1_000);
  expect(board.standing).toMatchObject({
    rank: 1,
    score: 1_000,
    totalPlayers: 1,
  });

  await savePracticeRunV2(storedRun(userId, "board-run-2", 400));
  board = await getLeaderboardV2("grid", 0, 0, userId);
  expect(board.rows[0]?.score).toBe(1_000);

  await savePracticeRunV2(storedRun(userId, "board-run-3", 1_500));
  board = await getLeaderboardV2("grid", 0, 0, userId);
  expect(board.rows[0]?.score).toBe(1_500);

  const entry = await db
    .select({ runRecordId: leaderboardEntryV2.runRecordId })
    .from(leaderboardEntryV2)
    .where(eq(leaderboardEntryV2.userId, userId));
  const run3 = await db
    .select({ id: runRecordV2.id })
    .from(runRecordV2)
    .where(
      and(eq(runRecordV2.userId, userId), eq(runRecordV2.runId, "board-run-3")),
    );
  expect(entry[0]?.runRecordId).toBe(run3[0]?.id);
});

it("does not list a client-ineligible run but still stores the run row", async () => {
  const userId = await seedUser("practice-board-ineligible");
  await savePracticeRunV2(
    storedRun(userId, "ineligible-run", 9_999, { leaderboardEligible: false }),
  );

  const board = await getLeaderboardV2("grid", 0, 0, userId);
  expect(board.rows).toEqual([]);
  expect(board.standing).toBeNull();

  const stored = await db
    .select({ runId: runRecordV2.runId })
    .from(runRecordV2)
    .where(
      and(
        eq(runRecordV2.userId, userId),
        eq(runRecordV2.runId, "ineligible-run"),
      ),
    );
  expect(stored).toHaveLength(1);
});

it("leaves no partial board row when the run payload conflicts", async () => {
  const userId = await seedUser("practice-board-conflict");
  const input = storedRun(userId, "conflict-run", 700);
  await savePracticeRunV2(input);

  const changed = JSON.stringify({
    runId: input.runId,
    score: 700,
    changed: true,
  });
  await expect(
    savePracticeRunV2({
      ...input,
      finalScore: 5_000,
      payloadJson: changed,
      payloadHash: createHash("sha256").update(changed).digest("hex"),
    }),
  ).rejects.toBeInstanceOf(RunSubmissionConflictErrorV2);

  const board = await getLeaderboardV2("grid", 0, 0, userId);
  expect(board.rows[0]?.score).toBe(700);
});

it("ranks two users on the same board", async () => {
  const a = await seedUser("board-two-a");
  const b = await seedUser("board-two-b");
  await savePracticeRunV2(
    storedRun(a, "two-a", 800, { modeId: "pinpoint", scenarioVersion: 5 }),
  );
  await savePracticeRunV2(
    storedRun(b, "two-b", 900, { modeId: "pinpoint", scenarioVersion: 5 }),
  );

  const board = await getLeaderboardV2("pinpoint", 5, 0, a);
  expect(board.totalPlayers).toBe(2);
  expect(board.rows.map((r) => r.score)).toEqual([900, 800]);
  expect(board.standing).toMatchObject({ rank: 2, totalPlayers: 2 });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npx vitest run packages/database/test/run-v2.spec.ts`
Expected: FAIL — new assertions (`board.rows` non-empty, `standing` non-null) fail because `savePracticeRunV2` writes no board row.

- [ ] **Step 4: Add `leaderboardEligible` to the input type and its validation**

In `packages/database/src/run-v2.ts`:

In `interface StoredRunInputV2` add a line (anywhere in the interface body):

```ts
  readonly leaderboardEligible: boolean;
```

In `assertStoredRunInputV2`, add to the large boolean `if (...)` chain (any position before the closing `)`):

```ts
    || typeof input.leaderboardEligible !== "boolean"
```

- [ ] **Step 5: Wrap `savePracticeRunV2` in a transaction and upsert the board row**

In `packages/database/src/run-v2.ts`, replace the entire body of `savePracticeRunV2` — everything from `assertStoredRunInputV2(input);` down to (and including) its final `return ...;` — with:

```ts
assertStoredRunInputV2(input);

return db.transaction(async (tx) => {
  const inserted = await tx
    .insert(runRecordV2)
    .values({
      id: randomUUID(),
      runId: input.runId,
      userId: input.userId,
      modeId: input.modeId,
      scenarioVersion: input.scenarioVersion,
      scoringVersion: input.scoringVersion,
      analyticsVersion: input.analyticsVersion,
      runClass: "practice",
      serverDisposition: "practice-only",
      finalScore: input.finalScore,
      startedAtMs: input.startedAtMs,
      completedAtMs: input.completedAtMs,
      activeDurationMs: input.activeDurationMs,
      payloadHash: input.payloadHash,
      payloadJson: input.payloadJson,
      createdAt: new Date(),
    })
    .onConflictDoNothing({ target: [runRecordV2.userId, runRecordV2.runId] })
    .returning({ id: runRecordV2.id });

  let runRecordId: string;
  let status: "stored" | "already-stored";

  const created = inserted[0];
  if (created) {
    runRecordId = created.id;
    status = "stored";
  } else {
    const existing = (
      await tx
        .select({
          id: runRecordV2.id,
          payloadHash: runRecordV2.payloadHash,
          runClass: runRecordV2.runClass,
          serverDisposition: runRecordV2.serverDisposition,
        })
        .from(runRecordV2)
        .where(
          and(
            eq(runRecordV2.userId, input.userId),
            eq(runRecordV2.runId, input.runId),
          ),
        )
        .limit(1)
    )[0];
    if (
      !existing ||
      existing.payloadHash !== input.payloadHash ||
      existing.runClass !== "practice" ||
      existing.serverDisposition !== "practice-only"
    ) {
      throw new RunSubmissionConflictErrorV2();
    }
    runRecordId = existing.id;
    status = "already-stored";
  }

  if (input.leaderboardEligible) {
    const boardId = createBoardIdV2(
      input.modeId,
      input.scenarioVersion,
      input.scoringVersion,
    );
    const now = new Date();
    await tx
      .insert(leaderboardEntryV2)
      .values({
        id: randomUUID(),
        boardId,
        modeId: input.modeId,
        scenarioVersion: input.scenarioVersion,
        scoringVersion: input.scoringVersion,
        userId: input.userId,
        runRecordId,
        score: input.finalScore,
        achievedAt: new Date(input.completedAtMs),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [leaderboardEntryV2.boardId, leaderboardEntryV2.userId],
        set: {
          runRecordId,
          score: input.finalScore,
          achievedAt: new Date(input.completedAtMs),
          updatedAt: now,
        },
        setWhere: sql`${leaderboardEntryV2.score} < excluded.score`,
      });
  }

  return { id: runRecordId, status };
});
```

Then run `grep -n "findRunByUserAndRunId" packages/database/src/run-v2.ts`. If the only remaining reference is its own definition, delete the `findRunByUserAndRunId` function.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npx vitest run packages/database/test/run-v2.spec.ts`
Expected: PASS — new cases green; the pre-existing "idempotent per user and runId" and "rejects invalid or hash-mismatched" cases still pass (the `storedRun` default from Step 1 covers them).

- [ ] **Step 7: Typecheck the package**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npm run -w @findmysensi-secure/database typecheck`
Expected: no errors.

- [ ] **Step 8: Confirm there is no schema delta**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npm run -w @findmysensi-secure/database db:generate`
Expected: drizzle-kit reports no changes / creates no new `drizzle/0009_*.sql`. If it _does_ create one, discard it (`git checkout -- packages/database/drizzle`) and re-check the schema — the plan assumes zero structural change.

- [ ] **Step 9: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi-secure
git add packages/database/src/run-v2.ts packages/database/test/run-v2.spec.ts
git commit -m "feat(leaderboard): write practice runs to the public board

savePracticeRunV2 now upserts a best-score-wins leaderboard_entry_v2 row
in-transaction, skipped when the client flags the run ineligible. No
publication opt-in, no verification.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Route wiring + response literal (findmysensi-secure)

**Files:**

- Modify: `apps/api/src/run-v2.ts`
- Test: `apps/api/src/run-v2.spec.ts`

**Interfaces:**

- Consumes: `savePracticeRunV2` (Task 1 — now expects `leaderboardEligible: boolean` in its input), `getLeaderboardV2` (unchanged).
- Produces: `POST /api/v2/runs` success body `competitiveStatus: "listed"` (was `"practice-only"`).

- [ ] **Step 1: Update the route test**

In `apps/api/src/run-v2.spec.ts`:

Rename `it("stores a valid payload as practice-only and hashes canonical content", ...)` to
`it("stores a valid payload as a listed board score and hashes canonical content", ...)` and change its body's two expectations to:

```ts
expect(await response?.json()).toMatchObject({
  protocolVersion: 2,
  runId: RUN_ID,
  submissionStatus: "stored",
  runClass: "practice",
  competitiveStatus: "listed",
  leaderboard: { standing: null },
});
expect(mocks.savePracticeRunV2).toHaveBeenCalledWith(
  expect.objectContaining({
    userId: "user-1",
    runId: RUN_ID,
    leaderboardEligible: true,
    payloadHash: expect.stringMatching(/^[0-9a-f]{64}$/),
  }),
);
```

Add a new test immediately after it:

```ts
it("forwards a client-ineligible flag to the store", async () => {
  const payload = validRunPayload();
  payload.clientEligibility = {
    leaderboardEligible: false,
    invalidationReasons: ["paused-mid-run"],
  };
  await handleRunV2Request(runRequest(JSON.stringify(payload)));
  expect(mocks.savePracticeRunV2).toHaveBeenCalledWith(
    expect.objectContaining({ leaderboardEligible: false }),
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npx vitest run apps/api/src/run-v2.spec.ts`
Expected: FAIL — response still says `"practice-only"`; `savePracticeRunV2` called without `leaderboardEligible`.

- [ ] **Step 3: Wire the route**

In `apps/api/src/run-v2.ts`, inside `handlePracticeRunSubmission`, in the `await savePracticeRunV2({ ... })` argument object add:

```ts
      leaderboardEligible: parsed.data.clientEligibility.leaderboardEligible,
```

In the same function's success `return json({ ... })` object, change:

```ts
        competitiveStatus: "practice-only",
```

to:

```ts
        competitiveStatus: "listed",
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npx vitest run apps/api/src/run-v2.spec.ts`
Expected: PASS.

- [ ] **Step 5: Full secure-repo verification**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npm run typecheck && npm run lint && npm test`
Expected: all green. If an unrelated pre-existing failure appears, record its output verbatim and continue — do not fix out of scope.

- [ ] **Step 6: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi-secure
git add apps/api/src/run-v2.ts apps/api/src/run-v2.spec.ts
git commit -m "feat(leaderboard): route practice submissions to the board as 'listed'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Transitional response literal (findmysensi protocol)

**Files:**

- Modify: `packages/protocol/src/v2/run-submission.ts`
- Test: `packages/protocol/test/run-submission-v2.spec.ts`

**Interfaces:**

- Produces: `PracticeRunSubmissionResponseV2Schema.competitiveStatus` accepts `"practice-only"` **and** `"listed"`. `PracticeRunSubmissionResponseV2` type widens to that union.

- [ ] **Step 1: Add the schema test**

In `packages/protocol/test/run-submission-v2.spec.ts`, add a new `it` immediately after
`it("models a practice-only response without inventing a standing", ...)`:

```ts
it("accepts both the transitional and the new competitiveStatus", () => {
  const base = {
    protocolVersion: 2,
    runId: validClickRun().runId,
    submissionStatus: "stored",
    runClass: "practice",
    leaderboard: {
      board: {
        boardId: "grid:scenario-0:scoring-0",
        modeId: "grid",
        scenarioVersion: 0,
        scoringVersion: 0,
      },
      totalPlayers: 0,
      percentileMinimumPlayers: LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2,
      standing: null,
    },
  } as const;
  expect(
    PracticeRunSubmissionResponseV2Schema.safeParse({
      ...base,
      competitiveStatus: "practice-only",
    }).success,
  ).toBe(true);
  expect(
    PracticeRunSubmissionResponseV2Schema.safeParse({
      ...base,
      competitiveStatus: "listed",
    }).success,
  ).toBe(true);
  expect(
    PracticeRunSubmissionResponseV2Schema.safeParse({
      ...base,
      competitiveStatus: "ranked",
    }).success,
  ).toBe(false);
});
```

(`LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2` and `validClickRun` are already imported in this spec file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run packages/protocol/test/run-submission-v2.spec.ts`
Expected: FAIL on the `"listed"` case (`z.literal("practice-only")` rejects it).

- [ ] **Step 3: Widen the literal**

In `packages/protocol/src/v2/run-submission.ts` (around line 366), change:

```ts
    competitiveStatus: z.literal("practice-only"),
```

to:

```ts
    // Transitional: web must accept "listed" (new) before the API deploy that
    // sends it, and "practice-only" (old) until that deploy lands. A follow-up
    // narrows this to z.literal("listed").
    competitiveStatus: z.enum(["practice-only", "listed"]),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run packages/protocol/test/run-submission-v2.spec.ts`
Expected: PASS (the pre-existing `"models a practice-only response..."` test also still passes).

- [ ] **Step 5: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add packages/protocol/src/v2/run-submission.ts packages/protocol/test/run-submission-v2.spec.ts
git commit -m "feat(protocol): accept 'listed' competitiveStatus alongside 'practice-only'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: api-client response fixture (findmysensi)

**Files:**

- Test: `packages/api-client/test/run-v2.spec.ts`

**Interfaces:**

- Consumes: `PracticeRunSubmissionResponseV2Schema` (Task 3). No source change to `packages/api-client/src/browser.ts` — `submitPracticeRunV2` already validates against the schema.

- [ ] **Step 1: Update the fixture + assertion**

In `packages/api-client/test/run-v2.spec.ts`:

- line ~69: `competitiveStatus: "practice-only",` -> `competitiveStatus: "listed",`
- line ~98: `expect(result.data?.competitiveStatus).toBe("practice-only");` -> `expect(result.data?.competitiveStatus).toBe("listed");`

- [ ] **Step 2: Run the test**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run packages/api-client/test/run-v2.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add packages/api-client/test/run-v2.spec.ts
git commit -m "test(api-client): expect 'listed' in the run-sync response fixture

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Results-screen copy in the view-model (findmysensi)

**Files:**

- Modify: `apps/web/src/features/results/results-overview.ts`
- Test: `apps/web/src/features/results/results-overview.spec.ts`

**Interfaces:**

- No signature change. `buildResultsOverview(current, history, leaderboard?)` unchanged. Only `note` strings inside `getLeaderboardMetrics` and `getScoreDeltaNote` change.

- [ ] **Step 1: Update the view-model tests**

In `apps/web/src/features/results/results-overview.spec.ts`:

Rename `it("shows only a verified server standing as global rank and percentile", ...)` to
`it("shows the server standing as rank and percentile", ...)` and change its two `toMatchObject` blocks to:

```ts
expect(metric(overview.summaryMetrics, "Leaderboard Rank")).toMatchObject({
  value: "#3",
  note: "Best of 25 on this board",
});
expect(metric(overview.summaryMetrics, "Percentile")).toMatchObject({
  value: "91.7%",
  note: "Top of 25 ranked players",
});
```

Add a new test at the end of the `describe("buildResultsOverview", ...)` block:

```ts
it("prompts to sync when there is no server standing yet", () => {
  const current = run();
  const overview = buildResultsOverview(current, [current], {
    board: {
      boardId: "grid:scenario-0:scoring-0",
      modeId: "grid",
      scenarioVersion: 0,
      scoringVersion: 0,
    },
    totalPlayers: 0,
    percentileMinimumPlayers: 10,
    standing: null,
  });
  expect(metric(overview.summaryMetrics, "Leaderboard Rank")).toMatchObject({
    value: "—",
    note: "Sync your run to see your rank",
  });
  expect(metric(overview.summaryMetrics, "Percentile")).toMatchObject({
    value: "—",
    note: "Awaiting sync",
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/results/results-overview.spec.ts`
Expected: FAIL on the reworded notes.

- [ ] **Step 3: Rewrite `getLeaderboardMetrics`**

In `apps/web/src/features/results/results-overview.ts`, replace the whole `getLeaderboardMetrics` function with:

```ts
function getLeaderboardMetrics(
  leaderboard: LeaderboardContextV2 | null,
): readonly [OverviewMetric, OverviewMetric] {
  const standing = leaderboard?.standing;
  if (!standing) {
    return [
      {
        label: "Leaderboard Rank",
        value: "—",
        note: "Sync your run to see your rank",
        tone: "muted",
      },
      {
        label: "Percentile",
        value: "—",
        note: "Awaiting sync",
        tone: "muted",
      },
    ];
  }

  return [
    {
      label: "Leaderboard Rank",
      value: `#${standing.rank.toLocaleString()}`,
      note: `Best of ${standing.totalPlayers.toLocaleString()} on this board`,
    },
    standing.percentile === null
      ? {
          label: "Percentile",
          value: "—",
          note: `Shown once ${leaderboard.percentileMinimumPlayers.toLocaleString()} players have a score`,
          tone: "muted",
        }
      : {
          label: "Percentile",
          value: `${formatDecimal(standing.percentile, 1)}%`,
          note: `Top of ${leaderboard.totalPlayers.toLocaleString()} ranked players`,
        },
  ];
}
```

- [ ] **Step 4: De-jargon `getScoreDeltaNote`**

In the same file, in `getScoreDeltaNote`:

Change:

```ts
return current.leaderboardEligible
  ? "First eligible result"
  : "No eligible comparison";
```

to:

```ts
return current.leaderboardEligible ? "First run" : "Run not counted";
```

Change:

```ts
if (!current.leaderboardEligible) return "Run not eligible for PB";
```

to:

```ts
if (!current.leaderboardEligible) return "Run not counted for best";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/results/results-overview.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add apps/web/src/features/results/results-overview.ts apps/web/src/features/results/results-overview.spec.ts
git commit -m "feat(leaderboard): reword results rank copy for the open board

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Results screen copy + leaderboard link (findmysensi)

**Files:**

- Modify: `apps/web/src/features/results/routes.ts`
- Modify: `apps/web/src/features/results/PracticeResults.tsx`
- Test: `apps/web/src/features/results/practice-results.spec.ts`
- Test: `apps/web/src/features/results/routes.spec.ts` (existing — extend if it asserts the route object shape; otherwise leave)

**Interfaces:**

- Produces: `PracticeResultsRoutes` gains `readonly leaderboard: string;` = `/app/train/${encodedMode}/leaderboard`.

- [ ] **Step 1: Update the copy-integrity test**

In `apps/web/src/features/results/practice-results.spec.ts`, replace these two lines:

```ts
expect(normalizedSource).toContain("Saved to Account · Practice");
expect(normalizedSource).toContain(
  "Practice runs cannot enter the official leaderboard without authoritative Ranked verification.",
);
```

with:

```ts
expect(normalizedSource).toContain("Saved to Account");
expect(normalizedSource).toContain(
  "Your best score for this mode is now on the public leaderboard.",
);
expect(normalizedSource).not.toContain("authoritative Ranked verification");
expect(normalizedSource).toContain("View leaderboard");
```

Leave every other assertion untouched.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/results/practice-results.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Add the `leaderboard` route**

In `apps/web/src/features/results/routes.ts`:

- Add `readonly leaderboard: string;` to the `PracticeResultsRoutes` interface.
- In the returned object add:

```ts
    leaderboard: `/app/train/${encodedMode}/leaderboard`,
```

If `apps/web/src/features/results/routes.spec.ts` asserts the exact key set of the returned object, add `leaderboard` to that expectation.

- [ ] **Step 4: Update `getRunSyncCopy`, the eligibility note, and add the link**

In `apps/web/src/features/results/PracticeResults.tsx`:

Replace `case "saved":` in `getRunSyncCopy` with:

```ts
    case "saved":
      return {
        tag: "Saved to Account",
        description:
          "Your best score for this mode is now on the public leaderboard.",
      };
```

In the eligibility `role="note"` block, change the fallback sentence
`" It could not be verified for ranked play."` to
`" It will not count toward the leaderboard."`.

In the `<div className="app-results-actions">` block, insert a link between the "Play Again" and "Return to Hub" anchors:

```tsx
<a href={routes.leaderboard} className="app-button app-button-ghost">
  View leaderboard
</a>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/results/practice-results.spec.ts apps/web/src/features/results/routes.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add apps/web/src/features/results/PracticeResults.tsx apps/web/src/features/results/routes.ts apps/web/src/features/results/practice-results.spec.ts apps/web/src/features/results/routes.spec.ts
git commit -m "feat(leaderboard): results screen links to the mode board, truthful copy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Leaderboard view-model (findmysensi)

**Files:**

- Create: `apps/web/src/features/leaderboard/mode-leaderboard.ts`
- Create: `apps/web/src/features/leaderboard/mode-leaderboard.spec.ts`

**Interfaces:**

- Consumes: `LeaderboardResponseV2` type from `@findmysensi/protocol`.
- Produces:

  ```ts
  export interface LeaderboardViewRow {
    readonly rank: number;
    readonly username: string;
    readonly score: string; // pre-formatted, e.g. "151,200"
    readonly achievedAt: string; // pre-formatted, e.g. "Sep 8, 2026"
    readonly isSelf: boolean;
  }
  export interface LeaderboardView {
    readonly rows: readonly LeaderboardViewRow[];
    readonly selfOutsideList: LeaderboardViewRow | null;
    readonly totalPlayers: number;
    readonly percentileLabel: string | null;
  }
  export function buildLeaderboardView(
    response: LeaderboardResponseV2,
    selfUsername: string | null,
  ): LeaderboardView;
  ```

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/leaderboard/mode-leaderboard.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { LeaderboardResponseV2 } from "@findmysensi/protocol";
import { buildLeaderboardView } from "./mode-leaderboard.js";

function response(
  overrides: Partial<LeaderboardResponseV2> = {},
): LeaderboardResponseV2 {
  return {
    protocolVersion: 2,
    board: {
      boardId: "grid:scenario-0:scoring-0",
      modeId: "grid",
      scenarioVersion: 0,
      scoringVersion: 0,
    },
    rows: [
      {
        rank: 1,
        username: "ace",
        score: 151200,
        achievedAt: "2026-09-08T00:00:00.000Z",
      },
      {
        rank: 2,
        username: "bee",
        score: 140000,
        achievedAt: "2026-09-08T00:00:00.000Z",
      },
    ],
    totalPlayers: 2,
    percentileMinimumPlayers: 10,
    standing: null,
    ...overrides,
  };
}

describe("buildLeaderboardView", () => {
  it("formats rows and marks the self row", () => {
    const view = buildLeaderboardView(response(), "bee");
    expect(view.rows[0]).toMatchObject({
      rank: 1,
      username: "ace",
      score: "151,200",
      isSelf: false,
    });
    expect(view.rows[1]?.isSelf).toBe(true);
    expect(view.selfOutsideList).toBeNull();
  });

  it("returns a self-standing line when the player is not in the listed rows", () => {
    const view = buildLeaderboardView(
      response({
        standing: {
          rank: 57,
          score: 90000,
          percentile: null,
          totalPlayers: 2,
          achievedAt: "2026-09-08T00:00:00.000Z",
        },
      }),
      "zed",
    );
    expect(view.selfOutsideList).toMatchObject({
      rank: 57,
      username: "zed",
      score: "90,000",
      isSelf: true,
    });
  });

  it("omits the self-standing line when the player is already listed", () => {
    const view = buildLeaderboardView(
      response({
        standing: {
          rank: 2,
          score: 140000,
          percentile: null,
          totalPlayers: 2,
          achievedAt: "2026-09-08T00:00:00.000Z",
        },
      }),
      "bee",
    );
    expect(view.selfOutsideList).toBeNull();
  });

  it("derives a percentile label only when present", () => {
    expect(buildLeaderboardView(response(), null).percentileLabel).toBeNull();
    const withPct = buildLeaderboardView(
      response({
        standing: {
          rank: 1,
          score: 151200,
          percentile: 92.5,
          totalPlayers: 12,
          achievedAt: "2026-09-08T00:00:00.000Z",
        },
      }),
      "ace",
    );
    expect(withPct.percentileLabel).toBe("Top 7.5%");
  });

  it("handles an anonymous viewer", () => {
    const view = buildLeaderboardView(response(), null);
    expect(view.rows.every((r) => r.isSelf === false)).toBe(true);
    expect(view.selfOutsideList).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/leaderboard/mode-leaderboard.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the view-model**

Create `apps/web/src/features/leaderboard/mode-leaderboard.ts`:

```ts
import type { LeaderboardResponseV2 } from "@findmysensi/protocol";

export interface LeaderboardViewRow {
  readonly rank: number;
  readonly username: string;
  readonly score: string;
  readonly achievedAt: string;
  readonly isSelf: boolean;
}

export interface LeaderboardView {
  readonly rows: readonly LeaderboardViewRow[];
  readonly selfOutsideList: LeaderboardViewRow | null;
  readonly totalPlayers: number;
  readonly percentileLabel: string | null;
}

function formatScore(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildLeaderboardView(
  response: LeaderboardResponseV2,
  selfUsername: string | null,
): LeaderboardView {
  const rows: LeaderboardViewRow[] = response.rows.map((row) => ({
    rank: row.rank,
    username: row.username,
    score: formatScore(row.score),
    achievedAt: formatDate(row.achievedAt),
    isSelf: selfUsername !== null && row.username === selfUsername,
  }));

  const standing = response.standing;
  const listed = rows.some((row) => row.isSelf);
  const selfOutsideList: LeaderboardViewRow | null =
    standing && selfUsername && !listed
      ? {
          rank: standing.rank,
          username: selfUsername,
          score: formatScore(standing.score),
          achievedAt: formatDate(standing.achievedAt),
          isSelf: true,
        }
      : null;

  const percentileLabel =
    standing && standing.percentile !== null
      ? `Top ${(100 - standing.percentile).toLocaleString(undefined, {
          maximumFractionDigits: 1,
        })}%`
      : null;

  return {
    rows,
    selfOutsideList,
    totalPlayers: response.totalPlayers,
    percentileLabel,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/leaderboard/mode-leaderboard.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add apps/web/src/features/leaderboard/mode-leaderboard.ts apps/web/src/features/leaderboard/mode-leaderboard.spec.ts
git commit -m "feat(leaderboard): view-model for the per-mode board page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Leaderboard page + routes + component (findmysensi)

**Files:**

- Create: `apps/web/src/features/leaderboard/routes.ts`
- Create: `apps/web/src/features/leaderboard/routes.spec.ts`
- Create: `apps/web/src/features/leaderboard/ModeLeaderboard.tsx`
- Create: `apps/web/app/app/train/[mode]/leaderboard/page.tsx`
- Create: `apps/web/app/train/[mode]/leaderboard/page.tsx`
- Modify: `apps/web/app/globals.css`

**Interfaces:**

- Consumes: `buildLeaderboardView` (Task 7); `BrowserApiClient.getLeaderboardV2(modeId, scenarioVersion, scoringVersion)` -> `ApiResult<LeaderboardResponseV2>` and `.getSession()` -> `SessionResponse | null` (existing); `trainerModeManifest` from `apps/web/src/trainer/mode-manifest.js` (existing — entries expose `.enabled`, `.scenarioEntry.presentation.title`, `.scenarioEntry.definition.scenarioVersion`, `.scenarioEntry.definition.scoringVersion`).
- Produces:

  ```ts
  export interface ModeLeaderboardRoutes {
    readonly play: string;
    readonly results: string;
    readonly hub: string;
  }
  export function getModeLeaderboardRoutes(mode: string): ModeLeaderboardRoutes;
  ```

- [ ] **Step 1: Write the routes test**

Create `apps/web/src/features/leaderboard/routes.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getModeLeaderboardRoutes } from "./routes.js";

describe("getModeLeaderboardRoutes", () => {
  it("builds encoded per-mode paths", () => {
    const routes = getModeLeaderboardRoutes("switch-track");
    expect(routes.play).toBe("/app/train/switch-track");
    expect(routes.results).toBe("/app/train/switch-track/results");
    expect(routes.hub).toBe("/app");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/leaderboard/routes.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `routes.ts`**

Create `apps/web/src/features/leaderboard/routes.ts`:

```ts
export interface ModeLeaderboardRoutes {
  readonly play: string;
  readonly results: string;
  readonly hub: string;
}

export function getModeLeaderboardRoutes(mode: string): ModeLeaderboardRoutes {
  const encodedMode = encodeURIComponent(mode);
  return {
    play: `/app/train/${encodedMode}`,
    results: `/app/train/${encodedMode}/results`,
    hub: "/app",
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/leaderboard/routes.spec.ts`
Expected: PASS.

- [ ] **Step 5: Implement `ModeLeaderboard.tsx`**

Create `apps/web/src/features/leaderboard/ModeLeaderboard.tsx`. Mirrors the fetch/cleanup pattern of `LiveLeaderboard.tsx` and the session lookup of `AuthenticatedPracticeResults.tsx`, but the page is public (no redirect):

```tsx
"use client";

import { useEffect, useState } from "react";
import { BrowserApiClient } from "@findmysensi/api-client";
import {
  buildLeaderboardView,
  type LeaderboardView,
} from "./mode-leaderboard.js";
import { getModeLeaderboardRoutes } from "./routes.js";

interface ModeLeaderboardProps {
  readonly mode: string;
  readonly taskName: string;
  readonly scenarioVersion: number;
  readonly scoringVersion: number;
}

type LoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly view: LeaderboardView };

export function ModeLeaderboard({
  mode,
  taskName,
  scenarioVersion,
  scoringVersion,
}: ModeLeaderboardProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const routes = getModeLeaderboardRoutes(mode);

  useEffect(() => {
    let active = true;
    const client = new BrowserApiClient();

    void (async () => {
      const [board, session] = await Promise.all([
        client.getLeaderboardV2(mode, scenarioVersion, scoringVersion),
        client.getSession().catch(() => null),
      ]);
      if (!active) return;

      if (!board.ok || !board.data) {
        setState({
          kind: "error",
          message: board.error ?? "The leaderboard is unavailable.",
        });
        return;
      }

      setState({
        kind: "ready",
        view: buildLeaderboardView(board.data, session?.user?.username ?? null),
      });
    })();

    return () => {
      active = false;
    };
  }, [mode, scenarioVersion, scoringVersion]);

  return (
    <main className="app-page app-results-page">
      <div className="app-page-inner">
        <article className="app-card app-card-wide">
          <header className="app-results-header">
            <p className="app-section-label">Leaderboard</p>
            <h1 className="app-heading">{taskName}</h1>
            <p className="app-subtext">
              Best score per player. Updates as runs are synced.
            </p>
          </header>

          {state.kind === "loading" ? (
            <p className="app-subtext">Loading leaderboard…</p>
          ) : state.kind === "error" ? (
            <div role="alert" className="app-alert">
              {state.message}
            </div>
          ) : state.view.rows.length === 0 ? (
            <p className="app-subtext">No scores yet. Be the first.</p>
          ) : (
            <>
              <table className="app-leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {state.view.rows.map((row) => (
                    <tr
                      key={`${row.rank}-${row.username}`}
                      className={
                        row.isSelf ? "app-leaderboard-self" : undefined
                      }
                    >
                      <td>#{row.rank}</td>
                      <td>{row.username}</td>
                      <td>{row.score}</td>
                      <td>{row.achievedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {state.view.selfOutsideList ? (
                <table className="app-leaderboard-table app-leaderboard-self-standing">
                  <tbody>
                    <tr className="app-leaderboard-self">
                      <td>#{state.view.selfOutsideList.rank}</td>
                      <td>{state.view.selfOutsideList.username}</td>
                      <td>{state.view.selfOutsideList.score}</td>
                      <td>{state.view.selfOutsideList.achievedAt}</td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
              {state.view.percentileLabel ? (
                <p className="app-subtext">
                  {state.view.percentileLabel} of ranked players
                </p>
              ) : null}
            </>
          )}

          <div className="app-results-actions">
            <a href={routes.play} className="app-button">
              Play this mode
            </a>
            <a href={routes.results} className="app-button app-button-ghost">
              Back to results
            </a>
            <a href={routes.hub} className="app-button app-button-ghost">
              Return to Hub
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Implement the server route**

Create `apps/web/app/app/train/[mode]/leaderboard/page.tsx`. The `../` depth mirrors the sibling `apps/web/app/app/train/[mode]/results/page.tsx` (five levels up to `src`):

```tsx
import { notFound } from "next/navigation";
import { ModeLeaderboard } from "../../../../../src/features/leaderboard/ModeLeaderboard.js";
import { trainerModeManifest } from "../../../../../src/trainer/mode-manifest.js";

export default async function ModeLeaderboardPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  const modeEntry = trainerModeManifest.get(mode);
  if (!modeEntry?.enabled) notFound();

  const { definition } = modeEntry.scenarioEntry;
  return (
    <ModeLeaderboard
      mode={mode}
      taskName={modeEntry.scenarioEntry.presentation.title}
      scenarioVersion={definition.scenarioVersion}
      scoringVersion={definition.scoringVersion}
    />
  );
}
```

- [ ] **Step 7: Implement the redirect stub**

Create `apps/web/app/train/[mode]/leaderboard/page.tsx` (mirrors `apps/web/app/train/[mode]/results/page.tsx`, four levels up to `src`):

```tsx
import { notFound, redirect } from "next/navigation";
import { isTrainerModeEnabled } from "../../../../src/trainer/mode-manifest.js";

export default async function LeaderboardRedirectPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isTrainerModeEnabled(mode)) notFound();
  redirect(`/app/train/${mode}/leaderboard`);
}
```

- [ ] **Step 8: Add minimal styles**

Run `grep -n "app-leaderboard" apps/web/app/globals.css` first. If nothing matches, append:

```css
.app-leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin: 16px 0;
}
.app-leaderboard-table th,
.app-leaderboard-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.app-leaderboard-table th:nth-child(3),
.app-leaderboard-table td:nth-child(3) {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.app-leaderboard-self {
  background: rgba(163, 230, 53, 0.12);
}
.app-leaderboard-self-standing {
  margin-top: -8px;
}
```

- [ ] **Step 9: Typecheck + lint the new files**

Run: `cd f:/Dev/findmysensi/findmysensi && npm run -w @findmysensi/web typecheck && npx eslint "apps/web/src/features/leaderboard/**" "apps/web/app/app/train/[mode]/leaderboard/**" "apps/web/app/train/[mode]/leaderboard/**"`
Expected: no errors. If `getLeaderboardV2().data` is not typed as `LeaderboardResponseV2`, re-check `packages/api-client/src/browser.ts` (`getLeaderboardV2` returns `Promise<ApiResult<LeaderboardResponseV2>>`).

- [ ] **Step 10: Run the leaderboard-feature tests**

Run: `cd f:/Dev/findmysensi/findmysensi && npx vitest run apps/web/src/features/leaderboard`
Expected: PASS (view-model + routes specs).

- [ ] **Step 11: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add "apps/web/src/features/leaderboard" "apps/web/app/app/train/[mode]/leaderboard" "apps/web/app/train/[mode]/leaderboard" apps/web/app/globals.css
git commit -m "feat(leaderboard): per-mode leaderboard page and route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Repoint the homepage widget + landing/hub copy (findmysensi)

**Files:**

- Modify: `apps/web/src/features/landing/LiveLeaderboard.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/app/page.tsx`

**Interfaces:**

- Consumes: `BrowserApiClient.getLeaderboardV2("grid", 0, 0)` -> `ApiResult<LeaderboardResponseV2>`; `LeaderboardRowV2` type (`{ rank, username, score, achievedAt }` — no `userId`).

- [ ] **Step 1: Repoint `LiveLeaderboard.tsx`**

- Replace `import type { LeaderboardRow } from "@findmysensi/protocol";` with
  `import type { LeaderboardRowV2 } from "@findmysensi/protocol";`.
- Change `useState<LeaderboardRow[] | null>(null)` to `useState<LeaderboardRowV2[] | null>(null)`.
- In `load()`, replace `const result = await client.getLeaderboard("gridshot");` and the lines that follow it through `setError(null);` with:

```ts
const result = await client.getLeaderboardV2("grid", 0, 0);
if (disposed) return;

if (!result.ok || !result.data) {
  setRows(null);
  setError(result.error ?? "Leaderboard is unavailable.");
  return;
}
setRows(result.data.rows.slice());
setError(null);
```

- In the `<tbody>` map, change `key={row.userId}` to `key={`${row.rank}-${row.username}`}`.
- Replace the three copy strings:
  - `Could not load the live Gridshot leaderboard. {error}` -> `Could not load the live Grid Rush leaderboard. {error}`
  - `Loading live Gridshot leaderboard…` -> `Loading live Grid Rush leaderboard…`
  - `No verified Gridshot scores yet.` -> `No Grid Rush scores yet.`

- [ ] **Step 2: Landing page section-03 copy**

In `apps/web/app/page.tsx` (the `id="leaderboard"` section, ~line 186) replace:

```tsx
<p>
  Practice history stays local. The public board stays empty until
  server-verified competition is ready.
</p>
```

with:

```tsx
<p>
  Every synced run lands on a public per-mode board. Your best score shows your
  rank the moment it saves.
</p>
```

- [ ] **Step 3: Trainer hub copy**

In `apps/web/app/app/page.tsx` (~line 241) replace
`Twelve focused exercises. Results stay local until verified scoring is enabled.`
with
`Twelve focused exercises. Each has its own public leaderboard.`

- [ ] **Step 4: Typecheck + homepage source test**

Run: `cd f:/Dev/findmysensi/findmysensi && npm run -w @findmysensi/web typecheck && npx vitest run apps/web/app/home-page.spec.ts`
Expected: PASS (`home-page.spec.ts` only asserts `id="leaderboard"` exists — unchanged).

- [ ] **Step 5: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add apps/web/src/features/landing/LiveLeaderboard.tsx apps/web/app/page.tsx apps/web/app/app/page.tsx
git commit -m "feat(leaderboard): homepage widget reads the live V2 grid board

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Documentation (findmysensi)

**Files:**

- Modify: `docs/protocol/v2/runs.md`
- Modify: `docs/protocol/v2/compatibility.md`
- Modify: `docs/adr/0001-repository-and-trust-boundary.md`

**Interfaces:** none.

- [ ] **Step 1: `docs/protocol/v2/runs.md`**

Under `## Status and trust boundary`, replace the paragraph beginning
"An official leaderboard projection may only consume a server-side run whose immutable disposition is `verified`. No public V2 route can create that disposition…" with:

```markdown
`POST /api/v2/runs` lists the run on the public per-mode leaderboard: the
server records the client-reported `finalScore` as the player's best for that
board when it beats their previous best. There is no replay verification. The
only guard is `clientEligibility.leaderboardEligible` — a run the client marks
ineligible (paused mid-run, pointer-lock lost, incomplete) is stored to the
player's history but not written to the board.
```

Change the bullet "Always returns `runClass: "practice"` and `competitiveStatus: "practice-only"`." to
"Always returns `runClass: "practice"`; `competitiveStatus` is `"listed"` (transitional builds may still send `"practice-only"`)."

- [ ] **Step 2: `docs/protocol/v2/compatibility.md`**

Replace the bullet
"V2 remains a draft until independent security review approves the complete authoritative Ranked start/proof/finish flow."
with
"Practice runs populate the public leaderboard directly under a trust-the-client model; there is no Ranked / verified flow."

- [ ] **Step 3: `docs/adr/0001-repository-and-trust-boundary.md`**

Append to the end of the document:

```markdown
> **2026-09-09 update:** the ranked / proof-replay leaderboard projection was
> not built. Practice runs are listed on the public leaderboard directly by
> `POST /api/v2/runs` under a trust-the-client model. `storeAuthoritativelyVerifiedRunV2`
> and the `leaderboard_publication_v2` table remain in the codebase, unused.
```

- [ ] **Step 4: Commit**

```bash
cd f:/Dev/findmysensi/findmysensi
git add docs/adr/0001-repository-and-trust-boundary.md docs/protocol/v2/runs.md docs/protocol/v2/compatibility.md
git commit -m "docs(leaderboard): document the open trust-the-client board model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Full verification, both repos

**Files:** none (verification only).

- [ ] **Step 1: Secure repo full gate**

Run: `cd f:/Dev/findmysensi/findmysensi-secure && npm run typecheck && npm run lint && npm test`
Expected: all green. Record any pre-existing unrelated failure verbatim; do not fix here.

- [ ] **Step 2: Public repo full gate**

Run: `cd f:/Dev/findmysensi/findmysensi && npm run typecheck && npm run lint && npm test`
Expected: all green.

- [ ] **Step 3: Public repo build**

Run: `cd f:/Dev/findmysensi/findmysensi && npm run build`
Expected: Next build succeeds; the routes `/app/train/[mode]/leaderboard` and `/train/[mode]/leaderboard` appear in the printed route table.

- [ ] **Step 4: E2E smoke (public repo)**

Check `package.json` scripts / `tests/e2e` for the E2E command (e.g. `npm run test:e2e` or `npx playwright test`). Run the public-smoke spec: `tests/e2e/specs/public-smoke.e2e.ts`.
Expected: PASS. If it asserts old leaderboard copy ("verified", "stays empty", "Gridshot"), update those assertions to the new copy and include them in Task 11's commit.

- [ ] **Step 5: Manual check (if a dev server + secure API are available)**

- Start the secure API and `npm run dev` (public).
- Log in, play Grid Rush, reach the results screen → **Leaderboard Rank** shows a number (e.g. `#1`), not `—`.
- Click **View leaderboard** → the per-mode page lists your row, highlighted.
- Open the homepage `#leaderboard` section → shows the Grid Rush board.

- [ ] **Step 6: Final commit (only if E2E copy fixes were needed)**

```bash
cd f:/Dev/findmysensi/findmysensi
git add -A
git commit -m "test(e2e): align public smoke with the open leaderboard copy

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

- Writer into `leaderboard_entry_v2`, best-score-wins, no publication check → Task 1. ✅
- Transactional save; rollback leaves no partial board row → Task 1 Step 5 + the "leaves no partial board row" test. ✅
- D1 (skip ineligible) → Task 1 (`input.leaderboardEligible` guard) + Task 2 (route passes it). ✅
- `competitiveStatus: "listed"` + D3 transitional enum → Task 2 (route) + Task 3 (protocol) + Task 4 (client fixture). ✅
- Results screen renders `standing` (logic unchanged) + reworded copy → Task 5 + Task 6. ✅
- New per-mode leaderboard page + routes + redirect stub → Task 7 (view-model) + Task 8. ✅
- D2 (personal standing from the read route, no route change) → Task 8 `ModeLeaderboard` reads `board.data.standing`; verified live in Task 11 Step 5. ✅
- Homepage widget repoint V1→V2 → Task 9. ✅
- Landing + hub + docs copy (ADR 0001, protocol v2 runs/compatibility) → Task 9 + Task 10. ✅
- D4 (no backfill) → Global Constraints; no task creates one. ✅
- No schema migration → Global Constraints + Task 1 Step 8 verifies zero Drizzle delta. ✅

**Placeholder scan:** No "TBD" / "handle appropriately" / "similar to Task N". Every code step contains literal code. The E2E command in Task 11 Step 4 is intentionally "check the repo's script" because the exact runner name is not pinned in this plan's context — flagged, not blank.

**Type consistency:**

- `StoredRunInputV2.leaderboardEligible: boolean` — defined Task 1 Step 4, consumed Task 2 Step 3 (`parsed.data.clientEligibility.leaderboardEligible`). ✅
- `buildLeaderboardView(response, selfUsername) -> LeaderboardView` — defined Task 7, consumed Task 8 `ModeLeaderboard.tsx`. ✅
- `getModeLeaderboardRoutes(mode) -> { play, results, hub }` — defined Task 8 Step 3, used in `ModeLeaderboard.tsx` (same task). ✅
- `PracticeResultsRoutes.leaderboard` — added Task 6 Step 3, used Task 6 Step 4 in `PracticeResults.tsx`. ✅
- `getLeaderboardV2(modeId, scenarioVersion, scoringVersion)` — matches the existing signature in `packages/api-client/src/browser.ts`. ✅
- `LeaderboardRowV2` = `{ rank, username, score, achievedAt }` — matches `LeaderboardRowV2Schema` in `packages/protocol/src/v2/run-submission.ts`; used Task 9. ✅
- `createBoardIdV2` and `leaderboardEntryV2` column names in Task 1 Step 5 match `packages/database/src/schema.ts` and the existing `storeAuthoritativelyVerifiedRunV2` upsert. ✅
