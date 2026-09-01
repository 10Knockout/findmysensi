import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("legacy public ticket results route", () => {
  it("does not render local practice history for arbitrary ticket ids", () => {
    const source = readFileSync(
      new URL("../../../app/results/[ticketId]/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("notFound");
    expect(source).not.toContain("PracticeResults");
  });
});
