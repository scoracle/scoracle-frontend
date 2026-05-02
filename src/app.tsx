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
          {/* Suspense is required for streaming SSR — Solid's resource
              streaming machinery uses this boundary to know where to
              flush chunks as createAsync resolves. Without it, the
              SSR renderer aborts mid-stream on the first pending
              resource and the worker silently truncates the response.
              Verified May 2026: removing this broke production SSR.
              No fallback specified — on cold loads the streamed shell
              fills in via createAsync chunks; on warm SPA navs, the
              hover-preload + query() cache means the resource is
              usually already settled, so the transition feels instant. */}
          <Suspense>{props.children}</Suspense>
          <Footer />
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
