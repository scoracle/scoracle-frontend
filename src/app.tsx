import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider, Title, Meta } from "@solidjs/meta";
import { Suspense, ErrorBoundary } from "solid-js";
import Header from "./components/solid/Header";
import Footer from "./components/solid/Footer";
import "./global.css";

// Site-default head metadata. All title/description tags flow through
// @solidjs/meta (NOT hardcoded in entry-server.tsx) so they dedupe to a
// single tag: these defaults apply site-wide, and routes override them —
// profile.tsx emits per-entity title/description/og, and async SSR (entry-server
// `mode: "async"`) resolves them before the head flush, so @solidjs/meta keeps the
// route's tag instead of this default. (Routes without an override — home,
// terms, privacy, 404 — ship these defaults.)
const DEFAULT_DESCRIPTION =
  "Sports intelligence for NBA, NFL, and Football — stats, news, social sentiment, and AI-powered insights on every player and team.";

/**
 * Route-aware Header wrapper. The header search only appears on the
 * profile page — it's the one place users search to pivot between
 * entities. Everywhere else (home's CrystalBall has its own SearchBar;
 * about / contact / terms / privacy don't need search) the header shows
 * a clean solid bar.
 */
function HeaderForRoute() {
  const location = useLocation();
  return <Header showSearch={location.pathname === "/profile"} />;
}

/**
 * Root-level error fallback. Without this, an uncaught client error in a route
 * subtree (e.g. a hydration desync) leaves the fallback-less <Suspense> blank —
 * header + footer survive, the page body vanishes. This degrades gracefully and
 * surfaces the error instead of a silent blank.
 */
function RouteError(props: { err: unknown }) {
  const message = props.err instanceof Error ? props.err.message : String(props.err);
  return (
    <main
      style={{
        "max-width": "640px",
        margin: "4rem auto",
        padding: "0 1.5rem",
        "text-align": "center",
      }}
    >
      <p style={{ "font-size": "1.1rem", color: "var(--text, #171717)" }}>
        Something went sideways loading this page.
      </p>
      <p
        style={{
          "font-size": "0.85rem",
          color: "var(--text-tertiary, #9c9890)",
          "margin-top": "0.5rem",
        }}
      >
        {message}
      </p>
      <a
        href="/"
        style={{ display: "inline-block", "margin-top": "1.25rem", color: "var(--text-secondary, #5c5853)" }}
      >
        Back to home
      </a>
    </main>
  );
}

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Scoracle</Title>
          <Meta name="description" content={DEFAULT_DESCRIPTION} />
          <Meta property="og:description" content={DEFAULT_DESCRIPTION} />
          <Meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
          <HeaderForRoute />
          {/* Root <Suspense> initializes SolidStart's streaming-SSR
              machinery — it's the boundary the renderer uses to flush
              chunks as each downstream resource resolves. Per-component
              <Suspense fallback={<Skeleton/>}> boundaries inside each
              component (EntityMeta, every tab) catch the granular
              throws, so each section streams its own chunk and shows
              its own skeleton fallback. SSR works (root boundary
              present); SPA navigation feels granular (each section
              suspends locally with its skeleton instead of holding
              the whole route). */}
          <ErrorBoundary fallback={(err) => <RouteError err={err} />}>
            <Suspense fallback={<div class="route-loading" aria-busy="true" style={{ "min-height": "60vh" }} />}>
              {props.children}
            </Suspense>
          </ErrorBoundary>
          <Footer />
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
