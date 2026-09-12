import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function About() {
  return (
    <>
      <Title>About - Scoracle</Title>
      <Meta
        name="description"
        content="Scoracle makes public sports box-score data easier to explore."
      />
      <main class="legal-main">
        <h1>About Scoracle</h1>
        <p>
          Scoracle is a simple way to explore sports data for NBA, NFL, and
          football (soccer) players and teams. We turn box scores into clear
          profiles, stats, comparisons, and fantasy output.
        </p>

        <h2>Our data</h2>
        <p>
          The app is built from previously seeded, publicly available event box
          scores. We keep that record available for browsing and comparison. The
          data we actively seed is fantasy data, which powers fantasy scoring and
          related views.
        </p>

        <h2>What you’ll find</h2>
        <ul>
          <li>Player and team profiles</li>
          <li>Box-score and season statistics</li>
          <li>Comparisons and trends</li>
          <li>Fantasy scoring where it is available</li>
        </ul>

        <h2>A quick note on accuracy</h2>
        <p>
          Sports records can change or contain mistakes. Scoracle is an
          independent reference tool, not an official league product. League,
          team, and player names are used for identification only.
        </p>

        <h2>Get in touch</h2>
        <p>
          Questions, feedback, or corrections? Email{" "}
          <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>.
        </p>
      </main>
    </>
  );
}
