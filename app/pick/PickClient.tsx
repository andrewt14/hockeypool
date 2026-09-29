"use client";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { addPlayer, removePlayer } from "@/app/actions";
import { useMe } from "@/components/Shell";
import { Headshot, PosBadge, TeamLogo } from "@/components/ui";
import type { RosterRow, Team } from "@/lib/db";
import { fmt, pickSlot, SLOTS, type Pos, type Slot } from "@/lib/pool";

export type PickPlayer = { id: number; name: string; team: string; pos: Pos; headshot: string | null; ly: number; now: number };

const FILTERS = ["All", "C", "W", "D", "G"] as const;
const SORTS = [
  { key: "ly", label: "Last yr" },
  { key: "now", label: "This yr" },
  { key: "name", label: "Name" },
] as const;
const PAGE = 40;
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function PickClient({ players, rosters, locked }: { players: PickPlayer[]; rosters: RosterRow[]; locked: boolean }) {
  const { me, teams } = useMe();
  const [rows, setRows] = useState(rosters); // optimistic copy of every team's roster
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<(typeof FILTERS)[number]>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("ly");
  const [limit, setLimit] = useState(PAGE);
  const [toast, setToast] = useState("");
  const [popped, setPopped] = useState<Slot | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const myTeam = me ? teamById.get(me.teamId) : undefined;

  const mySlots = new Map<Slot, PickPlayer>();
  const owners = new Map<number, Team[]>(); // other roommates who picked each player
  for (const r of rows) {
    const p = byId.get(r.player_id);
    if (me && r.team_id === me.teamId) { if (p) mySlots.set(r.slot, p); }
    else { const t = teamById.get(r.team_id); if (t) owners.set(r.player_id, [...(owners.get(r.player_id) ?? []), t]); }
  }
  const myIds = new Set([...mySlots.values()].map((p) => p.id));

  const list = useMemo(() => {
    const needle = fold(q.trim());
    const out = players.filter(
      (p) => (pos === "All" || p.pos === pos) && (!needle || fold(p.name).includes(needle) || p.team.toLowerCase() === needle),
    );
    return out.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b[sort] - a[sort] || b.ly - a.ly));
  }, [players, q, pos, sort]);

  // Infinite scroll: grow the rendered slice when the sentinel nears the viewport.
  const sentinel = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  async function add(p: PickPlayer) {
    if (!me) return;
    const slot = pickSlot(p.pos, mySlots.keys());
    if (!slot) return;
    const row = { team_id: me.teamId, slot, player_id: p.id };
    setRows((rs) => [...rs, row]);
    setPopped(slot);
    const res = await addPlayer(me.teamId, me.pin, p.id);
    if (res.error) {
      setRows((rs) => rs.filter((r) => r !== row));
      flash(res.error);
    } else if (res.slot && res.slot !== slot) {
      setRows((rs) => rs.map((r) => (r === row ? { ...row, slot: res.slot! } : r)));
    }
  }

  async function remove(slot: Slot) {
    if (!me || locked) return;
    const row = rows.find((r) => r.team_id === me.teamId && r.slot === slot);
    if (!row) return;
    setRows((rs) => rs.filter((r) => r !== row));
    const res = await removePlayer(me.teamId, me.pin, slot);
    if (res.error) {
      setRows((rs) => [...rs, row]);
      flash(res.error);
    }
  }

  const reset = () => setLimit(PAGE);

  return (
    <div className="pb-36">
      <header className="px-4 pt-6 pb-2">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-accent">
          {locked ? "Rosters locked" : "Build your roster"}
        </p>
        <h1 className="font-display text-3xl font-bold">Pick Players</h1>
      </header>

      {/* Filters stick under the top edge while scrolling */}
      <div className="top-safe sticky z-30 space-y-2 border-b border-line/60 bg-ink/95 px-4 py-3 backdrop-blur">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-mute" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); reset(); }}
            placeholder="Search players or team (e.g. TOR)"
            aria-label="Search players"
            className="h-12 w-full rounded-xl border border-line bg-panel pr-4 pl-11 text-base outline-none placeholder:text-mute focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setPos(f); reset(); }}
              aria-pressed={pos === f}
              className={`h-9 shrink-0 rounded-full px-4 font-display text-sm font-bold transition ${pos === f ? "bg-accent text-white" : "bg-panel text-mute"}`}
            >
              {f}
            </button>
          ))}
          <label className="ml-auto flex shrink-0 items-center gap-1 text-xs text-mute">
            Sort
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as typeof sort); reset(); }}
              className="h-9 rounded-lg border border-line bg-panel px-2 text-base text-white outline-none"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {players.length === 0 && (
        <p className="px-4 py-10 text-center text-mute">No players yet. An admin needs to hit “Refresh stats” in Settings.</p>
      )}

      <ul className="grid gap-2 px-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.slice(0, limit).map((p) => {
          const mine = myIds.has(p.id);
          const full = !mine && !pickSlot(p.pos, mySlots.keys());
          const others = owners.get(p.id) ?? [];
          return (
            <li key={p.id} className={`flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg shadow-black/20 transition-colors ${mine ? "border-accent/60" : "border-line"}`}>
              <Link href={`/player/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative">
                  <Headshot src={p.headshot} name={p.name} size={52} />
                  <span className="absolute -right-1 -bottom-1 rounded-full bg-panel p-0.5 ring-2 ring-card">
                    <TeamLogo abbr={p.team} size={18} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                    <PosBadge pos={p.pos} />
                    <span>{p.team}</span>
                    {p.now > 0 && <span>· {fmt(p.now)} now</span>}
                  </div>
                  {others.length > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-panel px-2 py-0.5 text-[11px] text-mute" title={others.map((t) => t.name).join(", ")}>
                      Also on {others.map((t) => t.emoji).join("")}
                    </p>
                  )}
                </div>
              </Link>
              <div className="w-11 text-right">
                <p className="font-display text-2xl leading-none font-bold">{fmt(p.ly)}</p>
                <p className="text-[10px] tracking-wide text-mute uppercase">LY pts</p>
              </div>
              {!locked && me && (
                <button
                  onClick={() => add(p)}
                  disabled={mine || full}
                  aria-label={mine ? `${p.name} is on your team` : full ? `No open ${p.pos} slot` : `Add ${p.name}`}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-2xl font-bold transition active:scale-90 ${
                    mine ? "bg-up/15 text-up" : full ? "bg-panel text-line" : "bg-accent text-white shadow-md shadow-accent/30 hover:bg-accent-hi"
                  }`}
                >
                  {mine ? "✓" : "+"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {limit < list.length && <div ref={sentinel} className="h-10" />}
      {players.length > 0 && list.length === 0 && <p className="px-4 py-10 text-center text-mute">No players match.</p>}

      {/* Draft tray */}
      {me && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-panel/95 px-3 pt-2 pb-3 backdrop-blur">
          <div className="mx-auto max-w-lg">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold">{myTeam?.emoji} {myTeam?.name}</span>
              <span className="text-mute">{locked ? "🔒 Locked" : mySlots.size ? "Tap a player to remove" : ""} · <b className="text-white">{mySlots.size}/9</b></span>
            </div>
            <ol className="grid grid-cols-9 gap-1.5">
              {SLOTS.map((slot) => {
                const p = mySlots.get(slot);
                return (
                  <li key={slot} className="flex flex-col items-center gap-0.5">
                    {p ? (
                      <button
                        key={`${slot}-${p.id}`}
                        onClick={() => remove(slot)}
                        disabled={locked}
                        aria-label={`Remove ${p.name} from ${slot}`}
                        className={`relative rounded-full ring-2 ring-accent ${popped === slot ? "animate-pop" : ""}`}
                      >
                        <Headshot src={p.headshot} name={p.name} size={36} />
                      </button>
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-line font-display text-xs font-bold text-mute">
                        {slot[0] === "U" ? "UT" : slot[0]}
                      </span>
                    )}
                    <span className="max-w-full truncate text-[9px] text-mute">{p ? p.name.split(" ").at(-1) : slot[0] === "U" ? "UTIL" : slot}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="animate-rise fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 mx-auto max-w-sm rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
