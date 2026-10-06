import "server-only";
import { db, getPlayers, getStandings, today } from "./db";
import { posFromCode, type Stats } from "./pool";
import { RANKING } from "./rankings";

// Bump both each September.
export const SEASON = "20262027";
const LAST_SEASON = "20252026";

const NHL_TEAMS = [
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET", "EDM", "FLA", "LAK", "MIN", "MTL", "NJD",
  "NSH", "NYI", "NYR", "OTT", "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK", "WPG", "WSH",
];

// The NHL API rate-limits bursts (429), so back off and retry a few times.
async function json(url: string, tries = 4): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 429 && tries > 1) {
    await new Promise((r) => setTimeout(r, 1000 * (Number(res.headers.get("retry-after")) || 2)));
    return json(url, tries - 1);
  }
  if (!res.ok) throw new Error(`NHL API ${res.status}: ${url}`);
  return res.json();
}

// Sequential and spaced: bursts trip a ~60s rate-limit penalty (json() retries through it).
async function fetchRosters() {
  const out = [];
  for (const team of NHL_TEAMS) {
    // Same data as /roster/{team}/current, minus a redirect (which doubles the request count).
    out.push({ team, r: await json(`https://api-web.nhle.com/v1/roster/${team}/${SEASON}`) });
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

type SummaryRow = {
  playerId: number; skaterFullName: string; teamAbbrevs: string; positionCode: string;
  gamesPlayed: number; goals: number; assists: number;
};

// Skaters only: goalies aren't in the pool. `before` (YYYY-MM-DD) limits to games on earlier days.
async function summaries(season: string, before?: string): Promise<SummaryRow[]> {
  const exp = `seasonId=${season} and gameTypeId=2${before ? ` and gameDate<"${before}"` : ""}`;
  return (await json(`https://api.nhle.com/stats/rest/en/skater/summary?limit=-1&cayenneExp=${encodeURIComponent(exp)}`)).data;
}

const toStats = (r: SummaryRow): Stats => ({
  gp: r.gamesPlayed, g: r.goals, a: r.assists,
});

type BoxPlayer = { playerId: number; goals: number; assists: number };
const STARTED = new Set(["LIVE", "CRIT", "FINAL", "OFF"]);

/**
 * This season's stats, live: season totals for games before today, plus today's box scores.
 * Splitting on the day counts each game exactly once, whether or not the season totals
 * have caught up with a game that just ended.
 */
async function liveStats(): Promise<Map<number, Stats>> {
  const day = today();
  const [rows, score] = await Promise.all([summaries(SEASON, day), json(`https://api-web.nhle.com/v1/score/${day}`)]);
  const out = new Map(rows.map((r) => [r.playerId, toStats(r)]));
  // Sequential: at most ~16 games a night, and bursts trip the rate limit.
  for (const g of score.games) {
    if (g.gameType !== 2 || !STARTED.has(g.gameState)) continue;
    const { playerByGameStats: box } = await json(`https://api-web.nhle.com/v1/gamecenter/${g.id}/boxscore`);
    for (const p of [box.awayTeam, box.homeTeam].flatMap((t) => [...t.forwards, ...t.defense]) as BoxPlayer[]) {
      const s = out.get(p.playerId) ?? {};
      out.set(p.playerId, { gp: (s.gp ?? 0) + 1, g: (s.g ?? 0) + p.goals, a: (s.a ?? 0) + p.assists });
    }
  }
  return out;
}

type RosterPlayer = { id: number; headshot: string; firstName: { default: string }; lastName: { default: string }; positionCode: string };

/** Fast path: update this season's live stats for players already in the pool, then snapshot. */
export async function refreshCurrentStats() {
  const cur = await liveStats();
  // Full rows so the upsert never inserts a partial player; new call-ups arrive with the daily full refresh.
  const upserts = (await getPlayers()).filter((p) => cur.has(p.id)).map((p) => ({ ...p, cur: cur.get(p.id) }));
  const { error } = await db().from("players").upsert(upserts);
  if (error) throw new Error(error.message);
  await snapshot();
  return { players: upserts.length };
}

/** Pull rosters + both seasons of stats, upsert players, then snapshot today's standings. */
export async function refreshStats() {
  const [rosters, cur, last, curById] = await Promise.all([
    fetchRosters(),
    summaries(SEASON), // names/teams of everyone who's played; stats come from liveStats
    summaries(LAST_SEASON),
    liveStats(),
  ]);
  const lastById = new Map(last.map((r) => [r.playerId, toStats(r)]));

  const rows = new Map<number, { id: number; name: string; team: string; pos: string; headshot: string }>();
  // Anyone with stats this season stays pickable and keeps scoring, even if dropped from a roster (sent down, etc).
  for (const r of cur) {
    const team = r.teamAbbrevs.split(",").at(-1)!;
    const pos = posFromCode(r.positionCode);
    if (!pos) continue;
    rows.set(r.playerId, {
      id: r.playerId, name: r.skaterFullName, team, pos,
      headshot: `https://assets.nhle.com/mugs/nhl/${SEASON}/${team}/${r.playerId}.png`,
    });
  }
  // Ranked players missing from rosters (injured, unsigned) still need to be pickable.
  const ranked = new Set(RANKING);
  for (const r of last) {
    if (rows.has(r.playerId) || !ranked.has(r.playerId)) continue;
    const pos = posFromCode(r.positionCode);
    const team = r.teamAbbrevs.split(",").at(-1)!;
    if (pos) rows.set(r.playerId, { id: r.playerId, name: r.skaterFullName, team, pos, headshot: `https://assets.nhle.com/mugs/nhl/${SEASON}/${team}/${r.playerId}.png` });
  }
  // Roster data wins: exact headshot URL and current team.
  for (const { team, r } of rosters) {
    for (const p of [...r.forwards, ...r.defensemen] as RosterPlayer[]) {
      const pos = posFromCode(p.positionCode);
      if (!pos) continue;
      rows.set(p.id, {
        id: p.id, name: `${p.firstName.default} ${p.lastName.default}`, team, pos, headshot: p.headshot,
      });
    }
  }
  const upserts = [...rows.values()].map((p) => ({ ...p, cur: curById.get(p.id) ?? {}, last: lastById.get(p.id) ?? {} }));
  const { error } = await db().from("players").upsert(upserts);
  if (error) throw new Error(error.message);
  await snapshot();
  return { players: upserts.length };
}

// Re-running on the same day overwrites that day's row, so "today" deltas stay vs yesterday.
async function snapshot() {
  const { rows: standings } = await getStandings();
  const day = today();
  await db().from("snapshots").upsert(standings.map((s) => ({ day, team_id: s.team.id, points: s.total, rank: s.rank })));
  await db().from("settings").update({ stats_updated_at: new Date().toISOString() }).eq("id", 1);
}
