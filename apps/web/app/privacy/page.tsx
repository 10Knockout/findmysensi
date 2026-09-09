import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, absoluteUrl } from "../../src/lib/site.js";
import {
  LegalPage,
  LegalSection,
  PRIVACY_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
} from "../../src/features/legal/LegalPage.js";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "How FindMySensi collects, uses, and protects your data. We collect the minimum needed to run an account and public leaderboards, and we do not sell personal data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/privacy"),
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title={TITLE}
      intro={`This policy explains what ${SITE_NAME} collects, why, and what choices you have. ${SITE_NAME} is a free, open-source aim trainer. We try to collect as little as possible.`}
    >
      <LegalSection heading="Who we are">
        <p>
          {SITE_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by Hitesh
          Mahay. For any privacy question or request, contact{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="text-emerald-400 hover:underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>
          <strong>Account data.</strong> When you create an account we store
          your username, email address, a hashed password, and your confirmation
          that you are 18 or older. Email verification uses a one-time code.
        </p>
        <p>
          <strong>Training and score data.</strong> When you sync a practice run
          we store the run&rsquo;s results (score, accuracy, timing, scenario
          and scoring version) linked to your account. Your best scores per mode
          are shown on{" "}
          <Link
            href="/leaderboards"
            className="text-emerald-400 hover:underline"
          >
            public leaderboards
          </Link>{" "}
          next to your username and any cosmetic avatar, frame, or tag you have
          selected.
        </p>
        <p>
          <strong>Technical data.</strong> Our hosting and email providers
          process standard request logs (IP address, user agent, timestamps) to
          deliver the service and protect it from abuse.
        </p>
        <p>
          <strong>Stored only in your browser.</strong> Local training history,
          achievements, selected avatar, and interface preferences are kept in
          your browser&rsquo;s local storage and are never sent to us unless you
          sync a run. A short-lived session storage entry holds your pending
          verification email during sign-up. Clearing site data removes all of
          it.
        </p>
        <p>
          We do not currently run third-party advertising or cross-site
          tracking. If we add privacy-respecting analytics we will update this
          policy and list the provider here before enabling it.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure your account and sign you in.</li>
          <li>
            To send account email you request (verification, password reset).
          </li>
          <li>
            To calculate and display your scores, ranks, and leaderboards.
          </li>
          <li>To detect and prevent cheating, abuse, and fraud.</li>
          <li>To operate, debug, and improve the service.</li>
        </ul>
        <p>
          We rely on your consent (account creation), on the performance of our
          agreement with you (running the trainer), and on our legitimate
          interest in keeping the service safe and working.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies and similar technology">
        <p>
          We use a single essential cookie to keep you signed in. It is not used
          for advertising or profiling. Local storage and session storage are
          used as described above for features you trigger. Because we use only
          strictly necessary storage, no consent banner is required for it; this
          will change if analytics is added.
        </p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>
          We do not sell personal data. We share data only with providers that
          run the service on our behalf, under contract:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A cloud hosting and edge platform (application hosting).</li>
          <li>A managed database provider (account and score storage).</li>
          <li>
            A transactional email provider (verification and reset email).
          </li>
        </ul>
        <p>
          We may also disclose data if required by law, or to protect the
          rights, safety, and integrity of the service and its users.
          Leaderboard entries (username, best score, rank, chosen cosmetics) are
          public by design.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          Account data is kept while your account exists. Synced runs and
          leaderboard entries are kept while your account exists or until you
          delete them. Provider request logs follow each provider&rsquo;s own
          retention period, typically a few weeks to a few months. When you
          delete your account we remove your account data and detach or delete
          your scores within 30 days, except where we must retain something to
          comply with law or resolve disputes.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access,
          correct, export, or delete your personal data, to object to or
          restrict certain processing, and to withdraw consent. You can change
          your email and password in{" "}
          <Link
            href="/app/settings"
            className="text-emerald-400 hover:underline"
          >
            account settings
          </Link>
          . For any other request, email{" "}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="text-emerald-400 hover:underline"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>{" "}
          and we will respond within a reasonable time. You may also complain to
          your local data protection authority.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          {SITE_NAME} is not directed to children. You must be 18 or older to
          create an account, and we ask you to confirm this at sign-up. If you
          believe a child has given us personal data, contact us and we will
          delete it.
        </p>
      </LegalSection>

      <LegalSection heading="International transfers">
        <p>
          Our providers may process data in countries other than yours,
          including the United States and the European Union. Where required, we
          rely on the providers&rsquo; standard contractual clauses or
          equivalent safeguards.
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          Passwords are hashed, traffic is encrypted in transit, and a strict
          Content Security Policy is enforced per request. No system is
          perfectly secure; if a breach affects you we will notify you and the
          relevant authority as required by law.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We will post any changes on this page and update the date above. The
          current version is effective as of{" "}
          {new Date(LEGAL_LAST_UPDATED).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          . Material changes will be announced in the app or by email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
