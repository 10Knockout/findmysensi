import React, { type ReactNode } from "react";
import Link from "next/link";

/**
 * Article bodies for `/guides/<slug>`. Kept as TSX (not MDX) so the guides
 * section adds zero build dependencies before launch — swap to MDX later if
 * the section grows. Each entry's `lede` is the answer-first opening
 * paragraph; write it so it stands alone as a quotable definition.
 */
export interface GuideContent {
  lede: string;
  body: ReactNode;
}

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-4 text-[15px] leading-7 text-zinc-300">{children}</p>
);
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mt-10 text-xl font-black text-white">{children}</h2>
);

export const GUIDE_CONTENT: Record<string, GuideContent> = {
  "cm-per-360-explained": {
    lede: "cm/360 is the distance, in centimetres, that you slide your mouse across the pad to rotate a full 360 degrees in game. It is the one sensitivity figure that means the same thing in every title, so it is the value a correct conversion keeps constant.",
    body: (
      <>
        <H2>Why in-game sensitivity does not transfer</H2>
        <P>
          Each game multiplies your raw mouse counts by its own internal factor
          before turning the camera. A sensitivity of 2.0 in one game and 2.0 in
          another can produce completely different turn speeds. What does not
          change is the physical motion your hand makes, and cm/360 measures
          exactly that.
        </P>
        <H2>How cm/360 relates to DPI and eDPI</H2>
        <P>
          DPI (or CPI) is how many counts your mouse reports per inch of motion.
          eDPI is in-game sensitivity multiplied by DPI. Raising either one
          lowers your cm/360, because you need less hand movement for the same
          rotation. eDPI is a fine shorthand <em>inside one game</em>; across
          games only cm/360 is comparable.
        </P>
        <H2>A practical range</H2>
        <P>
          Most competitive FPS players sit between roughly 25 and 50 cm/360.
          Lower than that rewards wrist aim and micro-correction; higher favours
          arm aim and fast repositioning. There is no single correct number —
          only one that is consistent with how you actually move.
        </P>
        <H2>Convert without losing cm/360</H2>
        <P>
          The{" "}
          <Link
            href="/tools/converter"
            className="text-emerald-400 hover:underline"
          >
            FindMySensi sensitivity converter
          </Link>{" "}
          holds cm/360 fixed while it translates your setting between Valorant,
          CS2, Apex and Aim Lab, and shows the in/360 and counts/360 equivalents
          so you can sanity-check the result.
        </P>
      </>
    ),
  },
  "valorant-to-cs2-sensitivity": {
    lede: "To convert a Valorant sensitivity to CS2 at the same DPI, multiply it by 3.18. A Valorant sensitivity of 0.4 becomes a CS2 sensitivity of about 1.27. The multiplier exists because the two games scale raw mouse input differently, and 3.18 is the ratio that keeps cm/360 identical.",
    body: (
      <>
        <H2>The formula</H2>
        <P>
          <strong>CS2 sensitivity = Valorant sensitivity &times; 3.18</strong>{" "}
          (DPI unchanged). To go the other way, divide by 3.18. Keep your mouse
          DPI the same on both sides or the conversion no longer holds.
        </P>
        <H2>Worked examples at 800 DPI</H2>
        <P>
          Valorant 0.25 &rarr; CS2 0.795. Valorant 0.35 &rarr; CS2 1.113.
          Valorant 0.5 &rarr; CS2 1.590. Valorant 0.7 &rarr; CS2 2.226. In every
          case the cm/360 — the real measure of your aim — is unchanged.
        </P>
        <H2>What the multiplier does not cover</H2>
        <P>
          Aim-down-sights and scoped sensitivity use separate multipliers in
          each game and are not part of this conversion. Zoom sensitivity in CS2
          and Valorant also follow their own settings. If you use a non-default
          &ldquo;zoom sensitivity&rdquo; value, set it deliberately rather than
          assuming it carried over.
        </P>
        <H2>Do it automatically</H2>
        <P>
          The{" "}
          <Link
            href="/tools/converter"
            className="text-emerald-400 hover:underline"
          >
            sensitivity converter
          </Link>{" "}
          applies the ratio for you and also reports cm/360, in/360 and
          counts/360, so you can confirm the match instead of trusting a single
          number. See{" "}
          <Link
            href="/guides/cm-per-360-explained"
            className="text-emerald-400 hover:underline"
          >
            cm/360 explained
          </Link>{" "}
          for why that is the figure that matters.
        </P>
      </>
    ),
  },
  "how-to-find-your-sensitivity": {
    lede: "To find a mouse sensitivity that fits your aim: pick a cm/360 range, test two or three values blind so expectation does not bias you, measure your accuracy and consistency on a fixed drill, then adjust in small steps and retest. Settle only on a value you actually measured.",
    body: (
      <>
        <H2>1. Start from cm/360, not the in-game number</H2>
        <P>
          Choose a bracket — for example 30 to 40 cm/360 — based on whether you
          prefer wrist or arm aim. Convert that to your game with the{" "}
          <Link
            href="/tools/converter"
            className="text-emerald-400 hover:underline"
          >
            converter
          </Link>
          . This gives you a small set of candidates instead of an infinite
          dial.
        </P>
        <H2>2. Test blind</H2>
        <P>
          Knowing which sensitivity you are on colours how it feels. Run
          counterbalanced blocks where the value is hidden, so your score
          reflects performance rather than preference. FindMySensi&rsquo;s
          calibration mode does this for you and only recommends a value you
          completed blocks on.
        </P>
        <H2>3. Measure something specific</H2>
        <P>
          Pick one drill and one or two metrics — time-to-kill and accuracy, or
          tracking hit-percentage — and hold them constant across candidates.
          Consistency between runs matters more than a single best score.
        </P>
        <H2>4. Adjust in small steps</H2>
        <P>
          If the winning candidate still feels slightly fast or slow, move by
          about 2 to 3 cm/360 and retest — not a large jump. Large changes reset
          the muscle memory you are trying to build.
        </P>
        <H2>5. Commit and stop tweaking</H2>
        <P>
          Once a value wins on evidence, keep it for several weeks. Most aim
          improvement after that point comes from training, not from the number.
        </P>
      </>
    ),
  },
};
