import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
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
          {/* No <Suspense> at the root: SPA navigations swap routes
              immediately, each tab's <Show when={data() !== undefined}
              fallback={<Skeleton .../>}> handles its own loading state,
              so the user sees the new shell + skeletons the moment they
              click. The skeleton IS the navigation feedback. Streaming
              SSR for cold loads still works — the streaming boundaries
              are per-resource inside createAsync, not at this root. */}
          {props.children}
          <Footer />
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
