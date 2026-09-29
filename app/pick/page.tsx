import { getPlayers, getRosters, getSettings } from "@/lib/db";
import { buildBoxes, lastPts, points } from "@/lib/pool";
import PickClient from "./PickClient";

export default async function PickPage() {
  const [players, rosters, settings] = await Promise.all([getPlayers(), getRosters(), getSettings()]);
  // Ship only the ~140 boxed players, trimmed to what the cards show.
  const boxes = buildBoxes(players).map((box) =>
    box.map((p) => ({
      id: p.id, name: p.name, team: p.team, pos: p.pos, headshot: p.headshot,
      ly: lastPts(p.last), now: points(p.cur, settings.scoring),
    })),
  );
  return <PickClient boxes={boxes} rosters={rosters} locked={settings.locked} />;
}
