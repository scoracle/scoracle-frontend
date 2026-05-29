import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider, Title, Meta } from "@solidjs/meta";
import { Suspense } from "solid-js";
import Header from "./components/solid/Header";
import Footer from "./components/solid/Footer";
import "./global.css";

// Site-default head metadata. All title/description tags flow through
// @solidjs/meta (NOT hardcoded in entry-server.tsx) so they dedupe to a
// single tag: these defaults apply site-wide, and routes override them —
// profile.tsx emits per-entity title/description/og with `deferStream`, so
// the override resolves before the head flush and @solidjs/meta keeps the
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
          <Suspense>{props.children}</Suspense>
          <Footer />
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
