"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { pickPlayer, removePlayer } from "@/app/actions";
import { useMe } from "@/components/Shell";
import { Headshot, PosBadge, TeamLogo } from "@/components/ui";
import type { RosterRow, Team } from "@/lib/db";
import { fmt, isDefenseRound, roundOf, ROUNDS, slotOf, type Pos } from "@/lib/pool";

export type BoxPlayer = { id: number; name: string; team: string; pos: Pos; headshot: string | null; ly: number; now: number; rank: number | null };

const ROUND_NUMS = Array.from({ length: ROUNDS }, (_, i) => i + 1);

export default function PickClient({ boxes, rosters, locked: rostersLocked }: { boxes: BoxPlayer[][]; rosters: RosterRow[]; locked: boolean }) {
  const { me, teams } = useMe();
  const [rows, setRows] = useState(rosters); // optimistic copy of every team's picks
  const [chosen, setChosen] = useState<number | null>(null); // round the user navigated to
  const [toast, setToast] = useState("");
  const [popped, setPopped] = useState<number | null>(null);
  const timers = useRef<{ toast?: ReturnType<typeof setTimeout>; advance?: ReturnType<typeof setTimeout> }>({});

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const myTeam = me ? teamById.get(me.teamId) : undefined;
  const myPick = new Map<number, number>(); // round → player id
  const others = new Map<number, Team[]>(); // player id → roommates who picked them
  for (const r of rows) {
    if (me && r.team_id === me.teamId) myPick.set(roundOf(r.slot), r.player_id);
    else { const t = teamById.get(r.team_id); if (t) others.set(r.player_id, [...(others.get(r.player_id) ?? []), t]); }
  }
  const firstOpen = ROUND_NUMS.find((n) => !myPick.has(n));
  const round = chosen ?? firstOpen ?? 1;
  const box = boxes[round - 1] ?? [];
  const done = myPick.size === ROUNDS;
  const locked = rostersLocked || done; // last pick makes your team final

  function flash(msg: string) {
    setToast(msg);
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToast(""), 2600);
  }

  async function choose(p: BoxPlayer) {
    if (!me || locked) return;
    const slot = slotOf(round);
    const prev = rows;
    const clearing = myPick.get(round) === p.id;
    setRows((rs) => [
      ...rs.filter((r) => !(r.team_id === me.teamId && r.slot === slot)),
      ...(clearing ? [] : [{ team_id: me.teamId, slot, player_id: p.id }]),
    ]);
    if (!clearing) {
      setPopped(p.id);
      // Jump to the next open round so the draft flows box to box.
      const next = ROUND_NUMS.find((n) => n > round && !myPick.has(n)) ?? ROUND_NUMS.find((n) => n !== round && !myPick.has(n));
      clearTimeout(timers.current.advance);
      if (next) timers.current.advance = setTimeout(() => { setChosen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }, 450);
    }
    const res = clearing ? await removePlayer(me.teamId, me.pin, slot) : await pickPlayer(me.teamId, me.pin, round, p.id);
    if (res.error) {
      clearTimeout(timers.current.advance);
      setRows(prev);
      setChosen(round);
      flash(res.error);
    }
  }

  return (
    <div>
      <header className="px-4 pt-6 pb-2">
        <p className="font-display text-xs font-bold tracking-widest text-accent uppercase">
          {rostersLocked ? "Rosters locked" : myTeam ? `${myTeam.emoji} ${myTeam.name}` : "Box pool"}
        </p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Pick Players</h1>
          <p className="pb-1 text-sm text-mute"><b className="text-white">{myPick.size}</b>/{ROUNDS} picked</p>
        </div>
      </header>

      {/* Round chips: sticky, horizontally scrollable, show which boxes are done */}
      <nav aria-label="Rounds" className="top-safe sticky z-30 border-b border-line/60 bg-ink/95 py-3 backdrop-blur">
        <ol className="flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
          {ROUND_NUMS.map((n) => {
            const picked = myPick.has(n), on = n === round;
            return (
              <li key={n} className="flex items-center">
                {n === ROUND_NUMS.find(isDefenseRound) && <span className="mr-1.5 h-6 w-px bg-line" aria-hidden />}
                <button
                  onClick={() => setChosen(n)}
                  aria-current={on ? "step" : undefined}
                  aria-label={`Round ${n}${isDefenseRound(n) ? " defense" : " forwards"}${picked ? ", picked" : ""}`}
                  className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl font-display leading-none font-bold transition ${
                    on ? "bg-accent text-white" : picked ? "bg-up/15 text-up" : "bg-panel text-mute"
                  }`}
                >
                  <span className="text-base">{picked && !on ? "✓" : n}</span>
                  <span className="text-[9px] opacity-80">{isDefenseRound(n) ? "D" : "F"}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {done && (
        <p className="animate-rise mx-4 mt-3 rounded-xl border border-up/40 bg-up/10 px-4 py-3 text-sm">
          ✅ All {ROUNDS} rounds picked. Your team is final.{" "}
          {me && <Link href={`/team/${me.teamId}`} className="font-semibold underline">View your team</Link>}
        </p>
      )}

      <section className="px-4 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Round {round}</h2>
            <p className="text-xs text-mute">{isDefenseRound(round) ? "Defensemen" : "Forwards"} · pick 1</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setChosen(Math.max(1, round - 1))} disabled={round === 1} aria-label="Previous round" className="h-10 w-10 rounded-full bg-panel text-xl disabled:opacity-30">‹</button>
            <button onClick={() => setChosen(Math.min(ROUNDS, round + 1))} disabled={round === ROUNDS} aria-label="Next round" className="h-10 w-10 rounded-full bg-panel text-xl disabled:opacity-30">›</button>
          </div>
        </div>

        {box.length === 0 && <p className="py-10 text-center text-mute">No players yet. An admin needs to hit “Refresh stats” in Settings.</p>}

        <ul className="grid gap-2 sm:grid-cols-2" key={round}>
          {box.map((p, i) => {
            const mine = myPick.get(round) === p.id;
            const also = others.get(p.id) ?? [];
            return (
              <li key={p.id} className="animate-rise" style={{ animationDelay: `${i * 25}ms` }}>
                <button
                  onClick={() => choose(p)}
                  disabled={locked || !me}
                  aria-pressed={mine}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-lg shadow-black/20 transition active:scale-[0.98] ${
                    mine ? "border-accent bg-accent/15" : "border-line bg-card"
                  }`}
                >
                  <div className="relative">
                    <Headshot src={p.headshot} name={p.name} size={52} />
                    <span className="absolute -right-1 -bottom-1 rounded-full bg-panel p-0.5 ring-2 ring-card">
                      <TeamLogo abbr={p.team} size={18} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-1.5 truncate font-semibold">
                      {p.rank && <span className="shrink-0 font-display text-sm font-bold text-gold" title="NHL.com fantasy big board rank">#{p.rank}</span>}
                      <span className="min-w-0 truncate">{p.name}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-mute">
                      <PosBadge pos={p.pos} />
                      <span>{p.team}</span>
                      {p.now > 0 && <span>· {fmt(p.now)} now</span>}
                    </div>
                    {also.length > 0 && (
                      <p className="mt-1 inline-flex rounded-full bg-panel px-2 py-0.5 text-[11px] text-mute">Also picked by {also.map((t) => t.emoji).join("")}</p>
                    )}
                  </div>
                  <div className="w-11 text-right">
                    <p className="font-display text-2xl leading-none font-bold">{p.ly}</p>
                    <p className="text-[10px] tracking-wide text-mute uppercase">LY pts</p>
                  </div>
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                      mine ? `border-accent bg-accent text-white ${popped === p.id ? "animate-pop" : ""}` : "border-line"
                    }`}
                  >
                    {mine && "✓"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {myPick.has(round) && !locked && <p className="mt-3 text-center text-xs text-mute">Tap another player to swap, or tap your pick again to clear it.</p>}
      </section>

      {toast && (
        <div role="status" className="animate-rise fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 mx-auto max-w-sm rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
