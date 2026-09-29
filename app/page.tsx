import Link from "next/link";
import { getStandings } from "@/lib/db";
import { fmt, SLOTS } from "@/lib/pool";
import { LocalTime, PageHeader } from "@/components/ui";

function Trend({ move }: { move: number }) {
  if (move > 0) return <span className="text-up" aria-label={`up ${move}`}>▲{move}</span>;
  if (move < 0) return <span className="text-accent-hi" aria-label={`down ${-move}`}>▼{-move}</span>;
  return <span className="text-mute" aria-label="no change">▬</span>;
}

export default async function Standings() {
  const { rows, settings } = await getStandings();
  return (
    <>
      <PageHeader kicker="Regular season" title="Standings" />
      <p className="-mt-1 mb-4 px-4 text-xs text-mute">
        Last updated <LocalTime iso={settings.stats_updated_at} />
        {settings.locked && " · 🔒 Rosters locked"}
      </p>
      <ol className="space-y-3 px-4">
        {rows.map((r, i) => {
          const lead = r.rank === 1 && r.total > 0;
          return (
            <li key={r.team.id} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
              <Link
                href={`/team/${r.team.id}`}
                className={`flex items-center gap-3 rounded-2xl border p-4 shadow-lg shadow-black/30 transition active:scale-[0.98] ${
                  lead ? "border-gold/70 bg-gradient-to-br from-gold/25 via-card to-card" : "border-line bg-card"
                }`}
              >
                <span className={`w-7 text-center font-display text-3xl font-extrabold ${lead ? "text-gold" : "text-mute"}`}>{r.rank}</span>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-panel text-3xl ${lead ? "ring-2 ring-gold" : ""}`}>
                  {r.team.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{r.team.name}</p>
                  <p className="text-xs text-mute">{lead ? "👑 Leader" : `${r.count}/${SLOTS.length} players`}</p>
                </div>
                <div className="text-right">
                  <p className={`font-display text-4xl leading-none font-bold ${lead ? "text-gold" : ""}`}>{fmt(r.total)}</p>
                  <p className="mt-1 flex items-center justify-end gap-1.5 text-xs">
                    <span className={r.today > 0 ? "text-up" : "text-mute"}>{r.today > 0 ? `+${fmt(r.today)}` : "0"} today</span>
                    <Trend move={r.move} />
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
