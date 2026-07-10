import { HttpStatusCode } from "@solidjs/start";
import { Title } from "@solidjs/meta";
import "./legal.css";

export default function NotFound() {
  return (
    <main class="legal-main notfound-main">
      <HttpStatusCode code={404} />
      <Title>Not found - Scoracle</Title>
      <h1>Page not found</h1>
      <p>There's nothing at this address.</p>
      <p>
        <a href="/">Back to home</a>
      </p>
    </main>
  );
}
