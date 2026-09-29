import Link from "next/link";
import { notFound } from "next/navigation";
import { getStandings } from "@/lib/db";
import { fmt, points, type Slot } from "@/lib/pool";
import { Headshot, PosBadge, TeamLogo } from "@/components/ui";

const GROUPS: [string, Slot[]][] = [
  ["Centers", ["C1", "C2"]],
  ["Wingers", ["W1", "W2"]],
  ["Defense", ["D1", "D2"]],
  ["Goalie", ["G1"]],
  ["Utility", ["U1", "U2"]],
];
// Only the stats that can score for that slot type, so names fit on a phone.
const SKATER = ["g", "a"] as const;
const GOALIE = ["w", "so", "otl"] as const;

export default async function TeamPage({ params }: PageProps<"/team/[id]">) {
  const id = Number((await params).id);
  const { rows, settings, rosters, players } = await getStandings();
  const row = rows.find((r) => r.team.id === id);
  if (!row) notFound();
  const byId = new Map(players.map((p) => [p.id, p]));
  const bySlot = new Map(rosters.filter((r) => r.team_id === id).map((r) => [r.slot, byId.get(r.player_id)]));

  return (
    <>
      <section className="m-4 rounded-3xl border border-line bg-gradient-to-br from-accent/25 via-card to-card p-5 shadow-xl shadow-black/30">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-panel text-4xl">{row.team.emoji}</span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-bold">{row.team.name}</h1>
            <p className="text-sm text-mute">
              Rank {row.rank} of {rows.length}
              {row.today > 0 && <span className="text-up"> · +{fmt(row.today)} today</span>}
            </p>
          </div>
        </div>
        <p className="mt-4 font-display text-6xl leading-none font-extrabold">{fmt(row.total)}</p>
        <p className="text-xs font-semibold tracking-widest text-mute uppercase">Fantasy points</p>
      </section>

      <div className="space-y-4 px-4">
        {GROUPS.map(([label, slots]) => {
          const cols = label === "Goalie" ? GOALIE : SKATER;
          return (
          <section key={label} className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2 text-[11px] font-bold tracking-wide text-mute uppercase">
              <span className="flex-1">{label}</span>
              {cols.map((c) => <span key={c} className="w-8 text-center">{c}</span>)}
              <span className="w-10 text-right text-white">Pts</span>
            </div>
            <ul>
              {slots.map((slot) => {
                const p = bySlot.get(slot);
                if (!p) {
                  return <li key={slot} className="px-3 py-4 text-sm text-mute italic">Empty slot</li>;
                }
                return (
                  <li key={slot} className="border-t border-line/50 first:border-t-0">
                    <Link href={`/player/${p.id}`} className="flex items-center gap-2 px-3 py-2.5">
                      <Headshot src={p.headshot} name={p.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="flex items-center gap-1 text-[11px] text-mute">
                          <TeamLogo abbr={p.team} size={14} /> {p.team} <PosBadge pos={p.pos} />
                        </p>
                      </div>
                      {cols.map((c) => (
                        <span key={c} className={`w-8 text-center text-sm tabular-nums ${p.cur[c] ? "" : "text-line"}`}>{p.cur[c] ?? 0}</span>
                      ))}
                      <span className="w-10 text-right font-display text-lg font-bold">{fmt(points(p.cur, settings.scoring))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          );
        })}
      </div>
    </>
  );
}
