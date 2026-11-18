import type { Metadata } from "next";
import { CalibrationFlow } from "../../../src/features/calibration/CalibrationFlow.js";

export const metadata: Metadata = {
  title: "Find My Sensi — Free Sensitivity Test",
  description:
    "Convert your in-game sensitivity or estimate it with a short blind A/B aim test. Free to use without an account.",
};

export default function PublicFindMySensiPage() {
  return <CalibrationFlow publicPractice />;
}
