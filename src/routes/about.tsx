import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function About() {
  return (
    <>
      <Title>About - Scoracle</Title>
      <Meta
        name="description"
        content="About Scoracle, contact information, privacy policy, and terms of service."
      />
      <main class="legal-main">
        <h1>About Scoracle</h1>
        <nav aria-label="Information sections">
          <a href="#about">About</a>{" · "}
          <a href="#contact">Contact</a>{" · "}
          <a href="#privacy">Privacy</a>{" · "}
          <a href="#terms">Terms</a>
        </nav>
        <section id="about" aria-label="About Scoracle">
          <p>
            Scoracle is a simple way to explore sports data for NBA, NFL, and
            football (soccer) players and teams. Explore profiles, statistics, comparisons,
            character readings, and ranked leaderboards where data is available.
          </p>

          <h2>Our data</h2>
          <p>
            The app presents prepared sports data and readings from Scoracle’s
            backend. Each profile shows the products available for that player or
            team. Readings can have different publication dates; the latest
            available reading stays visible until it is replaced.
          </p>

          <h2>What you’ll find</h2>
          <ul>
            <li>Player and team profiles</li>
            <li>Box-score and season statistics</li>
            <li>Comparisons and trends</li>
            <li>Character readings and ranked leaderboards</li>
            <li>Fantasy scoring where it is available</li>
          </ul>

          <h2>A quick note on accuracy</h2>
          <p>
            Sports records can change or contain mistakes. Scoracle is an
            independent reference tool, not an official league product. League,
            team, and player names are used for identification only.
          </p>
        </section>
        <section id="contact" aria-labelledby="contact-heading">
          <h2 id="contact-heading">Contact</h2>
          <p>
            We'd love to hear from you — questions, feedback, data corrections, and
            partnership inquiries are all welcome.
          </p>

          <h3>Email</h3>
          <p>
            <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>
          </p>
          <p>
            We aim to respond within a few business days. For data-accuracy issues,
            please include the player or team name and a link to the profile.
          </p>

          <p style="margin-top: 2rem">
            Learn more <a href="#about">about Scoracle</a>.
          </p>
        </section>
        <section id="privacy" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading">Privacy Policy</h2>
          <p class="legal-effective">Effective: September 12, 2026</p>

          <p>
            Scoracle does not require an account. We do not ask you for your name,
            email address, or payment information to use the app.
          </p>

          <h3>What the site uses</h3>
          <p>
            Your browser may save simple preferences, such as theme, selected sport,
            and recently viewed profiles. These help the app work the way you expect
            on your device. You can clear them at any time through your browser
            settings.
          </p>
          <p>
            Like most websites, our hosting and security services receive standard
            technical information when you visit, such as your IP address, browser,
            requested page, and time of visit. We use this only to keep Scoracle
            running securely and understand how it is performing.
          </p>

          <h3>Advertising and links</h3>
          <p>
            Scoracle may show ads through Google AdSense. Google and its partners
            may use cookies or similar technologies to provide and measure ads. You
            can manage personalized ad settings through{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Ads Settings
            </a>
            . Links to other websites are governed by those sites’ own privacy
            policies.
          </p>

          <h3>How we share information</h3>
          <p>
            We do not sell personal information. Our service providers may process
            limited technical data to host, secure, measure, or support advertising
            on Scoracle. We may also disclose information when the law requires it.
          </p>

          <h3>Questions</h3>
          <p>
            This site is not intended for children under 13. If you have a privacy
            question or request, email{" "}
            <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>. We may
            update this page as Scoracle changes; the date above will show when it
            was last revised.
          </p>

          <p style="margin-top: 2rem">
            See also: <a href="#terms">Terms of Service</a>.
          </p>
        </section>
        <section id="terms" aria-labelledby="terms-heading">
          <h2 id="terms-heading">Terms of Service</h2>
          <p class="legal-effective">Last updated: September 12, 2026</p>

          <p>
            Scoracle is a simple sports reference app. It organizes publicly
            available event box scores and uses them to create profiles, statistics,
            comparisons, and fantasy outputs.
          </p>

          <h3>Use Scoracle fairly</h3>
          <p>
            You may use Scoracle for personal, non-commercial purposes. Please do
            not misuse the site, interfere with its operation, use automated means
            to pull large amounts of data, or copy and republish our presentation or
            analysis as your own.
          </p>

          <h3>Data and output</h3>
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

          <h3>No guarantees</h3>
          <p>
            Scoracle is provided as available. We work to keep it useful, but cannot
            promise that every result is complete, current, or error-free. Our
            ratings and fantasy-related output are informational only; they are not
            advice or a guarantee of any result.
          </p>

          <h3>Changes and contact</h3>
          <p>
            We may update Scoracle or these terms from time to time. Continuing to
            use the site after an update means you accept the revised terms. For
            questions, email <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>.
          </p>

          <p style="margin-top: 2rem">
            See also: <a href="#privacy">Privacy Policy</a>.
          </p>
        </section>
      </main>
    </>
  );
}
