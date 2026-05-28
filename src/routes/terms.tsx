import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function Terms() {
  return (
    <main class="legal-main">
      <Title>Terms - Scoracle</Title>
      <Meta
        name="description"
        content="Scoracle Terms of Service — the terms governing your use of the Scoracle website and services."
      />
      <h1>Terms of Service</h1>
      <p class="legal-effective">Last Updated: May 28, 2026</p>

      <p>
        Welcome to Scoracle. These Terms of Service ("Terms") govern your use of
        scoracle.com and the services we provide (the "Service"), operated by
        Scoracle LLC, a Michigan limited liability company ("Scoracle", "we",
        "us", "our"). By accessing or using the Service, you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        Scoracle provides sports analytics, ratings, and related content for
        informational and entertainment purposes only.{" "}
        <strong>
          Scoracle is not a sportsbook, gambling platform, or financial advisor.
        </strong>{" "}
        Our ratings, projections, and other outputs are statistical estimates —
        not guarantees or advice — and any decisions you make based on them are
        your own responsibility. You must be at least 18 (or the age of majority
        where you live) to use the Service.
      </p>

      <h2>2. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service unlawfully or in violation of any applicable law;</li>
        <li>Scrape or extract data by automated means without our written consent;</li>
        <li>Reverse engineer or attempt to derive our models, schemas, or source code;</li>
        <li>Resell or redistribute Service content without authorization; or</li>
        <li>Interfere with, overburden, or disrupt the Service or its security.</li>
      </ul>

      <h2>3. Intellectual Property</h2>
      <p>
        The Service — including our software, models, derived statistics,
        ratings, and design — is owned by Scoracle LLC and protected by
        applicable law. We grant you a limited, personal, non-commercial license
        to use it. Raw factual data such as box-score statistics is not owned by
        anyone; our rights cover our original selection, arrangement, and
        analysis. League, team, and player names and marks belong to their
        respective owners and are used for identification only — Scoracle is not
        affiliated with or endorsed by any league, team, or athlete.
      </p>

      <h2>4. Third-Party Content</h2>
      <p>
        The Service displays data and content from third-party sources (news,
        social posts, stats providers) and may link to other sites. We do not
        control and are not responsible for third-party content, and we make no
        guarantee of its accuracy. Your interactions with it are governed by
        those parties' own terms.
      </p>

      <h2>5. Disclaimer</h2>
      <p>
        The Service is provided "as is" and "as available", without warranties of
        any kind. We do not warrant that it will be uninterrupted, error-free, or
        accurate, or that any prediction or projection will be realized. You use
        the Service at your own risk.
      </p>

      <h2>6. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Scoracle LLC will not be liable
        for any indirect, incidental, or consequential damages, or for any lost
        profits or data, arising from your use of the Service. Our total
        liability will not exceed one hundred U.S. dollars ($100).
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these Terms from time to time. The current version is
        always posted here with its "Last Updated" date; continued use after
        changes means you accept them.
      </p>

      <h2>8. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Michigan. Any
        dispute will be resolved in the state or federal courts located in
        Oakland County, Michigan.
      </p>

      <h2>9. Contact</h2>
      <p>
        <strong>Scoracle LLC</strong>
        <br />
        Royal Oak, Michigan
        <br />
        Email: <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>
      </p>

      <p style="margin-top: 2rem">
        See also: <a href="/privacy">Privacy Policy</a>.
      </p>
    </main>
  );
}
