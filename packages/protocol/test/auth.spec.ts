import { describe, expect, it } from "vitest";
import { RegisterRequestSchema } from "../src/schemas/auth.js";

const validRegistration = {
  email: "player@example.com",
  username: "player_one",
  password: "Valid!Password",
};

describe("registration age attestation contract", () => {
  it("requires explicit 18+ attestation", () => {
    expect(RegisterRequestSchema.safeParse(validRegistration).success).toBe(false);
    expect(
      RegisterRequestSchema.safeParse({
        ...validRegistration,
        ageAttested: false,
      }).success,
    ).toBe(false);
  });

  it("accepts registration only when age attestation is true", () => {
    expect(
      RegisterRequestSchema.safeParse({
        ...validRegistration,
        ageAttested: true,
      }).success,
    ).toBe(true);
  });
});
