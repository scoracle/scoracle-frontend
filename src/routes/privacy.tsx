import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function Privacy() {
  return (
    <main class="legal-main">
      <Title>Privacy - Scoracle</Title>
      <Meta
        name="description"
        content="How Scoracle handles visitor data and browser preferences."
      />
      <h1>Privacy Policy</h1>
      <p class="legal-effective">Effective: September 12, 2026</p>

      <p>
        Scoracle does not require an account. We do not ask you for your name,
        email address, or payment information to use the app.
      </p>

      <h2>What the site uses</h2>
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

      <h2>Advertising and links</h2>
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

      <h2>How we share information</h2>
      <p>
        We do not sell personal information. Our service providers may process
        limited technical data to host, secure, measure, or support advertising
        on Scoracle. We may also disclose information when the law requires it.
      </p>

      <h2>Questions</h2>
      <p>
        This site is not intended for children under 13. If you have a privacy
        question or request, email{" "}
        <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>. We may
        update this page as Scoracle changes; the date above will show when it
        was last revised.
      </p>

      <p style="margin-top: 2rem">
        See also: <a href="/terms">Terms of Service</a>.
      </p>
    </main>
  );
}
