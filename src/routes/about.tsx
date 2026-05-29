import { Title, Meta } from "@solidjs/meta";
import "./legal.css";

export default function About() {
  return (
    <>
      <Title>About - Scoracle</Title>
      <Meta
        name="description"
        content="About Scoracle — a sports intelligence platform with original ratings, vibe sentiment, stats, and curated news for every NBA, NFL, and football player and team."
      />
      <main class="legal-main">
        <h1>About Scoracle</h1>
        <p>
          Scoracle is a sports intelligence platform for the NBA, NFL, and
          football (soccer). For any player or team, we turn raw data and the
          day's coverage into clear, original signals — so you can size up form,
          momentum, and sentiment at a glance.
        </p>

        <h2>What you'll find on every profile</h2>
        <ul>
          <li>
            <strong>Rating</strong> — our composite score of a player or team's
            overall standing.
          </li>
          <li>
            <strong>Vibe</strong> — a sentiment read derived from current social
            and news coverage.
          </li>
          <li>
            <strong>Trends &amp; Traits</strong> — how key metrics are moving and
            what defines a profile.
          </li>
          <li>
            <strong>Stats &amp; Compare</strong> — the underlying numbers, with
            head-to-head comparison.
          </li>
          <li>
            <strong>News</strong> — a curated feed of relevant articles and posts,
            each linking out to its original source.
          </li>
        </ul>

        <h2>How it works</h2>
        <p>
          Scoracle's ratings and vibe scores are computed by our own models from
          public data and coverage. We surface third-party news and social posts
          for context and always link back to the source; the analysis and scoring
          on each page are our own.
        </p>

        <h2>Where our data comes from</h2>
        <p>
          The box scores, game logs, and season stats behind every profile are
          sourced from established sports data providers:
        </p>
        <ul>
          <li>
            <strong>NBA &amp; NFL</strong> — game and player box score data from{" "}
            <a
              href="https://www.balldontlie.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              BallDontLie
            </a>
            .
          </li>
          <li>
            <strong>Football (soccer)</strong> — match and player statistics from{" "}
            <a
              href="https://www.sportmonks.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              SportMonks
            </a>
            .
          </li>
        </ul>
        <p>
          We ingest this raw statistical data and layer our own ratings, trends,
          and vibe analysis on top of it. Scoracle is not affiliated with or
          endorsed by these providers or any league.
        </p>

        <h2>Get in touch</h2>
        <p>
          Questions, feedback, or corrections? Email{" "}
          <a href="mailto:admin@scoracle.com">admin@scoracle.com</a>, or see our{" "}
          <a href="/contact">Contact</a> page.
        </p>
      </main>
    </>
  );
}
