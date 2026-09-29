import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getRosters, getSettings, getTeams } from "@/lib/db";
import { fmt, points, type Stats } from "@/lib/pool";
import { Headshot, PosBadge, TeamLogo } from "@/components/ui";

export default async function PlayerPage({ params }: PageProps<"/player/[id]">) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [p, teams, rosters, settings] = await Promise.all([getPlayer(id), getTeams(), getRosters(), getSettings()]);
  if (!p) notFound();
  const ownerIds = new Set(rosters.filter((r) => r.player_id === id).map((r) => r.team_id));
  const owners = teams.filter((t) => ownerIds.has(t.id));
  const cols: [keyof Stats, string][] = [["gp", "GP"], ["g", "G"], ["a", "A"]];

  const statRow = (label: string, s: Stats) => (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs font-bold tracking-widest text-mute uppercase">{label}</p>
      <div className="mt-2 flex items-end gap-5">
        {cols.map(([k, l]) => (
          <div key={k}>
            <p className="font-display text-2xl font-bold">{s[k] ?? 0}</p>
            <p className="text-[11px] text-mute">{l}</p>
          </div>
        ))}
        <div className="ml-auto text-right">
          <p className="font-display text-3xl font-extrabold text-accent-hi">{fmt(points(s, settings.scoring))}</p>
          <p className="text-[11px] text-mute">FPTS</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/30 to-ink px-4 pt-8 pb-6 text-center">
        <div className="absolute top-4 right-4 opacity-30"><TeamLogo abbr={p.team} size={72} /></div>
        <div className="mx-auto w-fit rounded-full ring-4 ring-accent/60">
          <Headshot src={p.headshot} name={p.name} size={120} />
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold">{p.name}</h1>
        <p className="mt-1 flex items-center justify-center gap-2 text-sm text-mute">
          <PosBadge pos={p.pos} /> <TeamLogo abbr={p.team} size={18} /> {p.team}
        </p>
      </section>

      <div className="space-y-3 px-4">
        {statRow("This season", p.cur)}
        {statRow("Last season", p.last)}
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-bold tracking-widest text-mute uppercase">Owned by</p>
          {owners.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {owners.map((t) => (
                <Link key={t.id} href={`/team/${t.id}`} className="flex h-10 items-center gap-2 rounded-full bg-panel px-4 text-sm font-semibold">
                  {t.emoji} {t.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-mute">Nobody yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
