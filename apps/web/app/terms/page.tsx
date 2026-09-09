import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, GITHUB_URL, absoluteUrl } from "../../src/lib/site.js";
import {
  LegalPage,
  LegalSection,
  LEGAL_CONTACT_EMAIL,
  GOVERNING_LAW,
} from "../../src/features/legal/LegalPage.js";

const TITLE = "Terms of Service";
const DESCRIPTION =
  "The terms for using FindMySensi: a free, open-source browser aim trainer provided as-is, with fair-play rules for leaderboards and standard liability limits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/terms"),
    type: "website",
  },
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title={TITLE}
      intro={`These terms are the agreement between you and ${SITE_NAME} when you use the site, the trainer, the tools, and the leaderboards (the "Service"). By using the Service you accept these terms. If you do not agree, do not use the Service.`}
    >
      <LegalSection heading="Who can use the Service">
        <p>
          You must be at least 18 years old to create an account. You are
          responsible for your account and for keeping your password safe. Tell
          us promptly if you suspect unauthorised use.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            submit scores you did not achieve by playing normally, or use
            scripts, automation, memory editing, injected input, or other tools
            to manipulate results;
          </li>
          <li>
            probe, scan, overload, or disrupt the Service or its infrastructure,
            or bypass rate limits and anti-cheat measures;
          </li>
          <li>
            abuse, harass, impersonate, or infringe the rights of other users,
            or choose a username that is offensive or misleading;
          </li>
          <li>use the Service to break any applicable law.</li>
        </ul>
        <p>
          Leaderboards operate on a trust-the-client basis. We may review,
          adjust, hide, or remove any score, reset a board, or suspend or delete
          an account that we reasonably believe breaks these rules, at our
          discretion.
        </p>
      </LegalSection>

      <LegalSection heading="Your content">
        <p>
          You keep ownership of what you submit (such as your username and run
          data). You grant us a worldwide, non-exclusive, royalty-free licence
          to store, display, and process it as needed to run the Service,
          including showing your username, scores, rank, and chosen cosmetics on
          public leaderboards.
        </p>
      </LegalSection>

      <LegalSection heading="Open-source software">
        <p>
          The trainer, sensitivity math, scenarios, and scoring are published on{" "}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline"
          >
            GitHub
          </a>{" "}
          under the Mozilla Public License 2.0. Your use of that source code is
          governed by the MPL-2.0, not by these terms. These terms govern the
          hosted Service at this domain.
        </p>
      </LegalSection>

      <LegalSection heading="The tools are for guidance only">
        <p>
          The{" "}
          <Link
            href="/tools/converter"
            className="text-emerald-400 hover:underline"
          >
            sensitivity converter
          </Link>
          , the mouse DPI swap calculator, and the{" "}
          <Link href="/guides" className="text-emerald-400 hover:underline">
            guides
          </Link>{" "}
          are provided for informational purposes. Games change their
          sensitivity systems, and your setup may differ. Verify important
          settings yourself.
        </p>
      </LegalSection>

      <LegalSection heading="Availability and changes">
        <p>
          The Service is provided free of charge. We may change, suspend, or
          discontinue any part of it, and we may update these terms, at any
          time. If a change is material we will make reasonable effort to notify
          you. Continuing to use the Service after a change means you accept the
          updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimer of warranties">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;, without warranties of any kind, whether express or
          implied, including fitness for a particular purpose, non-infringement,
          and any warranty that the Service will be uninterrupted, secure, or
          error-free, or that scores and calculations will be accurate.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, {SITE_NAME} and its operator
          will not be liable for any indirect, incidental, special,
          consequential, or punitive damages, or for any loss of data, profits,
          or goodwill, arising from your use of or inability to use the Service.
          Because the Service is free, our total liability to you for any claim
          is limited to INR 1,000 (or the equivalent).
        </p>
      </LegalSection>

      <LegalSection heading="Indemnity">
        <p>
          You agree to indemnify and hold harmless {SITE_NAME} and its operator
          from any claim or demand arising out of your breach of these terms or
          your misuse of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="Termination">
        <p>
          You may stop using the Service and delete your account at any time. We
          may suspend or terminate your access if you breach these terms or if
          we reasonably need to protect the Service or other users. Sections
          that by their nature should survive termination (ownership,
          disclaimers, liability limits, governing law) will survive.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of {GOVERNING_LAW}, without
          regard to conflict-of-law rules. The courts located in {GOVERNING_LAW}{" "}
          will have exclusive jurisdiction, unless mandatory law in your country
          of residence provides otherwise.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-emerald-400 hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          . See also our{" "}
          <Link href="/privacy" className="text-emerald-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
