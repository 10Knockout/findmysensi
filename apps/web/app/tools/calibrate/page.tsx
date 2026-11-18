import type { Metadata } from "next";
import { CalibrationFlow } from "../../../src/features/calibration/CalibrationFlow.js";

export const metadata: Metadata = {
  title: "Find My Sensi — Free Sensitivity Test",
  description:
    "Compare aim sensitivities across five exercises, then test 0.01 steps. Play for free without an account.",
};

export default function PublicFindMySensiPage() {
  return <CalibrationFlow publicPractice />;
}
