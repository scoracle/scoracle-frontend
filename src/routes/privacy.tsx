import "./legal.css";

export default function Privacy() {
  return (
    <main class="legal-main">
      <h1>Privacy Policy</h1>
      <p class="legal-effective">Effective: TBD</p>

      <div class="legal-draft-banner">
        <strong>Draft</strong>
        This policy is a working draft and will be finalized before public launch.
        For questions in the meantime, contact <a href="mailto:hello@scoracle.com">hello@scoracle.com</a>.
      </div>

      <h2>1. Overview</h2>
      <p>
        Scoracle ("we", "us", "our") respects your privacy. This Privacy Policy
        explains what information we collect, how we use it, and the choices you
        have. By using the Service, you agree to the practices described here.
      </p>

      <h2>2. Information We Collect</h2>
      <p>We collect only what we need to operate the Service:</p>
      <ul>
        <li>
          <strong>Local preferences:</strong> theme (light/dark) and language are
          stored in your browser's <code>localStorage</code>. They never leave your
          device and we cannot read them server-side.
        </li>
        <li>
          <strong>Server logs:</strong> standard request metadata — IP address,
          user agent, requested URL, referrer, timestamp — recorded by our hosting
          provider (Cloudflare) for operational and security purposes.
        </li>
        <li>
          <strong>Aggregate analytics:</strong> page-view counts and Core Web
          Vitals via Cloudflare Web Analytics. No cookies are used and no
          individual user is identified.
        </li>
      </ul>
      <p>
        We do not require accounts or sign-ups. We do not collect names, email
        addresses, payment information, or precise location.
      </p>

      <h2>3. How We Use Information</h2>
      <p>We use the information above to:</p>
      <ul>
        <li>Operate, maintain, and improve the Service.</li>
        <li>Diagnose technical issues and protect against abuse.</li>
        <li>Understand aggregate usage patterns to inform product decisions.</li>
      </ul>

      <h2>4. Cookies and Local Storage</h2>
      <p>
        We use browser <code>localStorage</code> to remember your theme and language
        preferences. We do not use tracking cookies. If we add advertising or
        affiliate features in the future, this policy will be updated and a
        consent banner will be shown where required by law.
      </p>

      <h2>5. Sharing of Information</h2>
      <p>
        We do not sell or share your personal information with third parties.
        Server logs and aggregate analytics may be processed by our hosting and
        analytics providers (Cloudflare) under their own privacy terms. We may
        disclose information if required by law or in response to a valid legal
        request.
      </p>

      <h2>6. Third-Party Content</h2>
      <p>
        Scoracle displays content from third-party sources (news outlets, social
        platforms, stats providers). When you interact with embedded content from
        those services (for example, opening a tweet on X), that interaction is
        governed by the third party's privacy policy.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Depending on your jurisdiction (GDPR, CCPA, and similar laws) you may
        have the right to access, correct, or delete information we hold about
        you, and to object to or restrict certain processing. Because we collect
        no account data, requests will typically only apply to server logs and
        analytics records.
      </p>
      <p>
        To exercise these rights, contact <a href="mailto:hello@scoracle.com">hello@scoracle.com</a>.
      </p>

      <h2>8. Data Retention</h2>
      <p>
        Server logs are retained for the period required to maintain operational
        security and to investigate incidents — typically no longer than 30 days.
        Aggregate analytics are retained without personal identifiers.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        Scoracle is not directed to children under 13 (or the equivalent minimum
        age in your jurisdiction). We do not knowingly collect personal
        information from children.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will be
        announced on the Service. Continued use after changes take effect
        constitutes acceptance of the revised Policy.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy questions: <a href="mailto:hello@scoracle.com">hello@scoracle.com</a>.
      </p>

      <p style="margin-top: 2rem">
        See also: <a href="/terms">Terms of Service</a>.
      </p>
    </main>
  );
}
