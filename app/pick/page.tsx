import { getPlayers, getRosters, getSettings } from "@/lib/db";
import { points } from "@/lib/pool";
import PickClient from "./PickClient";

export default async function PickPage() {
  const [players, rosters, settings] = await Promise.all([getPlayers(), getRosters(), getSettings()]);
  // Ship only what the list needs; fantasy points are computed here with the current scoring.
  const slim = players.map((p) => ({
    id: p.id, name: p.name, team: p.team, pos: p.pos, headshot: p.headshot,
    ly: points(p.last, settings.scoring), now: points(p.cur, settings.scoring),
  }));
  return <PickClient players={slim} rosters={rosters} locked={settings.locked} />;
}
