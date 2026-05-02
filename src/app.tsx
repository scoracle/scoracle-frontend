import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Header from "./components/solid/Header";
import Footer from "./components/solid/Footer";
import "./global.css";

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
        <>
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
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
