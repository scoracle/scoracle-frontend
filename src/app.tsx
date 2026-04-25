import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import Header from "./components/solid/Header";
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
          <Suspense>{props.children}</Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
