import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { Suspense } from "solid-js";
import Header from "./components/solid/Header";
import Footer from "./components/solid/Footer";
import "./global.css";

// Note on OG / Twitter Card metadata: per-route Meta tags are added
// via `@solidjs/meta` (see e.g. routes/profile.tsx). We deliberately do
// NOT emit site-wide defaults from inside <MetaProvider> — @solidjs/meta's
// SSR dedup doesn't fully consolidate across SolidStart's Suspense
// streaming, so a default + route override produces TWO meta tags in
// head and crawlers pick the first (the default). Static, never-overridden
// tags (og:type, og:site_name, og:description, twitter:card,
// twitter:description) stay in entry-server.tsx where they ship as
// genuine HTML, not through the MetaProvider system. Routes that need a
// per-page og:image emit their own <Meta> via @solidjs/meta; routes that
// don't have one (home, terms, privacy, 404) currently ship without an
// og:image meta tag — add per-route Meta there if a preview is wanted.

/**
 * Route-aware Header wrapper. Hides the header search on `/` because
 * the home page's CrystalBall already contains its own SearchBar.
 */
function HeaderForRoute() {
  const location = useLocation();
  return <Header showSearch={location.pathname !== "/"} />;
}

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
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
          <Suspense>{props.children}</Suspense>
          <Footer />
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
