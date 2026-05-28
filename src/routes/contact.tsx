import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function Contact() {
  return (
    <>
      <Title>Contact - Scoracle</Title>
      <Meta
        name="description"
        content="Contact Scoracle — questions, feedback, data corrections, and partnership inquiries at admin@scoracle.com."
      />
      <main class="legal-main">
        <h1>Contact</h1>
        <p>
          We'd love to hear from you — questions, feedback, data corrections, and
          partnership inquiries are all welcome.
        </p>

        <h2>Email</h2>
        <p>
          <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>
        </p>
        <p>
          We aim to respond within a few business days. For data-accuracy issues,
          please include the player or team name and a link to the profile.
        </p>

        <p style="margin-top: 2rem">
          Learn more <a href="/about">about Scoracle</a>.
        </p>
      </main>
    </>
  );
}
