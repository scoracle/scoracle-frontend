import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function Privacy() {
  return (
    <main class="legal-main">
      <Title>Privacy - Scoracle</Title>
      <Meta
        name="description"
        content="How Scoracle handles your data — what we collect, cookies and advertising via Google AdSense, and your choices."
      />
      <h1>Privacy Policy</h1>
      <p class="legal-effective">Effective: May 28, 2026</p>

      <h2>1. Overview</h2>
      <p>
        Scoracle ("we", "us", "our") respects your privacy. This policy explains
        what we collect, how we use it, and your choices. By using the Service
        you agree to these practices. We do not require accounts and do not
        collect names, email addresses, or payment information.
      </p>

      <h2>2. What We Collect</h2>
      <ul>
        <li>
          <strong>Local preferences</strong> (theme, language) stored in your
          browser's <code>localStorage</code> — these never leave your device.
        </li>
        <li>
          <strong>Server logs</strong> — standard request metadata (IP address,
          user agent, URL, timestamp) kept by our host (Cloudflare) for security
          and operations, typically no longer than 30 days.
        </li>
        <li>
          <strong>Aggregate analytics</strong> — cookieless page-view and
          performance metrics via Cloudflare Web Analytics; no individual is
          identified.
        </li>
      </ul>
      <p>
        We use this information only to operate, secure, and improve the Service.
      </p>

      <h2>3. Cookies and Advertising</h2>
      <p>
        Scoracle uses <strong>Google AdSense</strong> to display ads. Google and
        its partners use cookies to serve ads based on your visits to this and
        other sites. You can opt out of personalized ads at{" "}
        <a
          href="https://www.google.com/settings/ads"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Ads Settings
        </a>{" "}
        or{" "}
        <a
          href="https://www.aboutads.info/choices/"
          target="_blank"
          rel="noopener noreferrer"
        >
          aboutads.info
        </a>
        . Where required by law, a consent banner is shown before non-essential
        cookies are set.
      </p>

      <h2>4. How We Share</h2>
      <p>
        We do not sell your personal information. Data may be processed by our
        service providers — Cloudflare (hosting and analytics) and Google
        (advertising) — under their own privacy terms. We display content from
        third parties (news, social posts, stats); interactions with it are
        governed by those parties' policies. We may disclose information if
        required by law.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        Depending on where you live (e.g., GDPR, CCPA), you may have rights to
        access, correct, or delete information about you. Because we hold no
        account data, this generally applies only to server logs. Scoracle is not
        directed to children under 13, and we do not knowingly collect their
        information. To make a request, contact{" "}
        <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>.
      </p>

      <h2>6. Changes and Contact</h2>
      <p>
        We may update this policy; material changes will be noted here with a new
        effective date. Questions?{" "}
        <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>.
      </p>

      <p style="margin-top: 2rem">
        See also: <a href="/terms">Terms of Service</a>.
      </p>
    </main>
  );
}
