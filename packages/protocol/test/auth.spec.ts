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
});
