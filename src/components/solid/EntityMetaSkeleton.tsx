/**
 * EntityMetaSkeleton — locked-Shell silhouette for SSR + the in-flight
 * window before EntityMeta's bundled-JSON meta resolves.
 *
 * Lives in its own file (not inside EntityMeta.tsx) so profile.tsx can
 * synchronously import the placeholder without pulling EntityMeta's
 * client-only data layer into the SSR chunk. EntityMeta itself is
 * loaded via `clientOnly(() => import(...))`; passing this skeleton as
 * its `fallback` prop means SSR ships the same 600×348 Shell silhouette
 * the resolved component occupies — zero layout shift between SSR and
 * hydration.
 */

import { useProfile } from "../../contexts/profile";
import Shell from "./Shell";
import Skeleton from "./Skeleton";
import "./EntityMeta.css";

export default function EntityMetaSkeleton() {
  const ctx = useProfile();
  return (
    <Shell class="meta-widget" cornerLabel={ctx.id} aria-label="Entity">
      <div class="pw-body">
        <div class="pw-loading">
          <Skeleton shape="circle" width={64} height={64} />
          <Skeleton shape="line" width={180} />
          <Skeleton shape="line" width={120} />
        </div>
      </div>
    </Shell>
  );
}
