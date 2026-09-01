import { describe, expect, it } from "vitest";
import { resolveSafeLoginDestination } from "./login-next.js";

describe("login continuation", () => {
  it("returns an authenticated app destination from the next query", () => {
    const destination = resolveSafeLoginDestination(
      "?next=%2Fapp%2Ftrain%2Fgrid%2Fresults",
    );

    expect(destination).toBe("/app/train/grid/results");
  });

  it("falls back to the app hub for missing or unsafe destinations", () => {
    expect(resolveSafeLoginDestination("")).toBe("/app");
    expect(resolveSafeLoginDestination("?next=https%3A%2F%2Fevil.example")).toBe(
      "/app",
    );
    expect(resolveSafeLoginDestination("?next=%2F%2Fevil.example")).toBe("/app");
    expect(resolveSafeLoginDestination("?next=%2Fregister")).toBe("/app");
  });
});
