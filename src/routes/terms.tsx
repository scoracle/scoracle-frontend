import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function Terms() {
  return (
    <main class="legal-main">
      <Title>Terms - Scoracle</Title>
      <Meta
        name="description"
        content="Simple terms for using Scoracle."
      />
      <h1>Terms of Service</h1>
      <p class="legal-effective">Last updated: September 12, 2026</p>

      <p>
        Scoracle is a simple sports reference app. It organizes publicly
        available event box scores and uses them to create profiles, statistics,
        comparisons, and fantasy outputs.
      </p>

      <h2>Use Scoracle fairly</h2>
      <p>
        You may use Scoracle for personal, non-commercial purposes. Please do
        not misuse the site, interfere with its operation, use automated means
        to pull large amounts of data, or copy and republish our presentation or
        analysis as your own.
      </p>

      <h2>Data and output</h2>
      <p>
        Our existing sports records are based on previously seeded public event
        box scores. We actively seed fantasy data and use it to generate fantasy
        scoring and related output. Sports data can be corrected, updated, or
        incomplete, so please treat Scoracle as a helpful reference rather than
        an official record.
      </p>

      <p>
        Scoracle’s organization, analysis, scoring, software, and design belong
        to Scoracle. League, team, and player names and marks belong to their
        respective owners and are used only to identify the sports subjects shown
        here. Scoracle is not affiliated with or endorsed by any league, team,
        or athlete.
      </p>

      <h2>No guarantees</h2>
      <p>
        Scoracle is provided as available. We work to keep it useful, but cannot
        promise that every result is complete, current, or error-free. Our
        ratings and fantasy-related output are informational only; they are not
        advice or a guarantee of any result.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update Scoracle or these terms from time to time. Continuing to
        use the site after an update means you accept the revised terms. For
        questions, email <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>.
      </p>

      <p style="margin-top: 2rem">
        See also: <a href="/privacy">Privacy Policy</a>.
      </p>
    </main>
  );
}
