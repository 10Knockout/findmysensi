import { describe, expect, it } from "vitest";
import { RegisterRequestSchema } from "../src/schemas/auth.js";

const validRegistration = {
  email: "player@example.com",
  username: "player_one",
  password: "Valid!Password",
};

describe("registration age attestation contract", () => {
  it("requires explicit 18+ attestation", () => {
    const missing = RegisterRequestSchema.safeParse(validRegistration);
    const declined = RegisterRequestSchema.safeParse({
      ...validRegistration,
      ageAttested: false,
    });

    expect(missing.success).toBe(false);
    expect(declined.success).toBe(false);
  });

  it("accepts registration only when age attestation is true", () => {
    const accepted = RegisterRequestSchema.safeParse({
      ...validRegistration,
      ageAttested: true,
    });

    expect(accepted.success).toBe(true);
  });

  it("accepts usernames containing allowed symbols (@, !, #, $, ., +, %, &, *, -, _)", () => {
    const allowedSymbols = ["@", "!", "#", "$", ".", "+", "%", "&", "*", "-", "_"];
    for (const symbol of allowedSymbols) {
      const parsed = RegisterRequestSchema.safeParse({
        ...validRegistration,
        username: `user${symbol}name`,
        ageAttested: true,
      });
      expect(parsed.success, `Expected username with '${symbol}' to be valid`).toBe(true);
    }
  });

  it("rejects usernames containing disallowed symbols or spaces", () => {
    const disallowed = ["user name", "user~name", "user?name", "user<name", "user=name", "user^name"];
    for (const username of disallowed) {
      const parsed = RegisterRequestSchema.safeParse({
        ...validRegistration,
        username,
        ageAttested: true,
      });
      expect(parsed.success, `Expected username '${username}' to be rejected`).toBe(false);
    }
  });

  it("accepts passwords containing any of the allowed symbols", () => {
    const allowedSymbols = ["@", "!", "#", "$", ".", "+", "%", "&", "*", "-", "_"];
    for (const symbol of allowedSymbols) {
      const parsed = RegisterRequestSchema.safeParse({
        ...validRegistration,
        password: `Valid${symbol}Password1`,
        ageAttested: true,
      });
      expect(parsed.success, `Expected password with '${symbol}' to be valid`).toBe(true);
    }
  });
});
