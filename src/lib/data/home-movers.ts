export interface HomeMover {
    sport: string;
    entity_type: string;
    id: number;
    name: string;
    image: string | null;
    team_logo: string | null;
    metric: "vibe" | "rating";
    /** Signed momentum delta (score off the movers board): + riser, − faller. */
    delta: number;
}
type MoverLeader = Pick<HomeMover, "entity_type" | "id" | "name" | "image" | "team_logo"> & { heat: number };
const MOVER_METRICS = ["vibe", "rating"] as const;
const MOVER_DIRECTIONS = ["up", "down"] as const;
export async function readHomeMovers(sports: string[], read: (sport: string, metric: "vibe" | "rating", direction: "up" | "down") => Promise<{ leaders: MoverLeader[] } | null>): Promise<HomeMover[]> {
    // Sport-paired order: each sport tells "vibe riser, vibe faller, rating
    // riser, rating faller" before the ball moves on to the next sport.
    const combos = sports.flatMap((sport) => MOVER_METRICS.flatMap((metric) => MOVER_DIRECTIONS.map((direction) => ({ sport, metric, direction }))));
    const movers = await Promise.all(combos.map(async ({ sport, metric, direction }) => {
        const board = await read(sport, metric, direction).catch(() => null);
        const leader = board?.leaders?.[0];
        if (!leader || !leader.heat)
            return null;
        return {
            sport,
            entity_type: leader.entity_type,
            id: leader.id,
            name: leader.name,
            image: leader.image,
            team_logo: leader.team_logo,
            metric,
            delta: leader.heat,
        } satisfies HomeMover;
    }));
    return movers.filter((mover): mover is HomeMover => mover !== null);
}
