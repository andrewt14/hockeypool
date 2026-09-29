import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { points, DEFAULT_SCORING, type Pos, type Scoring, type Slot, type Stats } from "./pool";

let client: SupabaseClient | undefined;
export function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (see README)");
  return (client ??= createClient(url, key, { auth: { persistSession: false } }));
}

export type Team = { id: number; name: string; emoji: string; hasPin: boolean };
export type Player = { id: number; name: string; team: string; pos: Pos; headshot: string | null; cur: Stats; last: Stats };
export type RosterRow = { team_id: number; slot: Slot; player_id: number };
export type Settings = { scoring: Scoring; locked: boolean; stats_updated_at: string | null };

/** Calendar day in Eastern time, when NHL games are scheduled. */
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getTeams(): Promise<Team[]> {
  const rows = must(await db().from("teams").select("id,name,emoji,pin").order("id"));
  return rows.map(({ pin, ...t }) => ({ ...t, hasPin: pin !== null }));
}

export async function getSettings(): Promise<Settings> {
  const s = must<Settings>(await db().from("settings").select("scoring,locked,stats_updated_at").eq("id", 1).single());
  return { ...s, scoring: { ...DEFAULT_SCORING, ...s.scoring } };
}

export async function getRosters(teamId?: number): Promise<RosterRow[]> {
  let q = db().from("rosters").select("team_id,slot,player_id");
  if (teamId) q = q.eq("team_id", teamId);
  return must(await q);
}

const PLAYER_COLS = "id,name,team,pos,headshot,cur,last";

/** All players (paged past Supabase's 1000-row cap), or just the given ids. */
export async function getPlayers(ids?: number[]): Promise<Player[]> {
  if (ids) return ids.length ? must(await db().from("players").select(PLAYER_COLS).in("id", ids)) : [];
  const out: Player[] = [];
  for (let from = 0; ; from += 1000) {
    const page = must(await db().from("players").select(PLAYER_COLS).order("id").range(from, from + 999));
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

export async function getPlayer(id: number): Promise<Player | null> {
  return must(await db().from("players").select(PLAYER_COLS).eq("id", id).maybeSingle());
}

/** Teams ranked by current fantasy points, with change vs the last snapshot before today. */
export async function getStandings() {
  const [teams, settings, rosters] = await Promise.all([getTeams(), getSettings(), getRosters()]);
  const players = await getPlayers([...new Set(rosters.map((r) => r.player_id))]);
  const byId = new Map(players.map((p) => [p.id, p]));
  const totals = teams.map((team) => {
    const mine = rosters.filter((r) => r.team_id === team.id);
    return { team, count: mine.length, total: mine.reduce((s, r) => s + points(byId.get(r.player_id)?.cur, settings.scoring), 0) };
  });
  const rankOf = (total: number) => 1 + totals.filter((t) => t.total > total).length;

  const snaps = must(
    await db().from("snapshots").select("day,team_id,points,rank").lt("day", today()).order("day", { ascending: false }).limit(teams.length),
  );
  const prevDay = snaps[0]?.day;
  const prev = new Map(snaps.filter((s) => s.day === prevDay).map((s) => [s.team_id, s]));

  const rows = totals
    .map((t) => {
      const rank = rankOf(t.total), p = prev.get(t.team.id);
      return { ...t, rank, today: p ? t.total - Number(p.points) : 0, move: p ? p.rank - rank : 0 };
    })
    .sort((a, b) => a.rank - b.rank || a.team.id - b.team.id);
  return { rows, settings, teams, rosters, players };
}
