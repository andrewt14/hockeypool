// Pure pool rules, shared by client and server. No imports so `node --test` can load it directly.

export type Pos = "C" | "W" | "D"; // skaters only; goalies aren't in the pool
export type Stats = { gp?: number; g?: number; a?: number };
export type Scoring = { g: number; a: number };

export const DEFAULT_SCORING: Scoring = { g: 1, a: 1 };

// Box pool: one pick per round. Rounds 1-10 are forward boxes, 11-14 are defense boxes.
export const FORWARD_ROUNDS = 10;
export const D_ROUNDS = 4;
export const BOX_SIZE = 10;
export const ROUNDS = FORWARD_ROUNDS + D_ROUNDS;
export const SLOTS = Array.from({ length: ROUNDS }, (_, i) => `R${i + 1}`);
export type Slot = string; // "R1".."R14"
export const slotOf = (round: number) => `R${round}`;
export const roundOf = (slot: string) => Number(slot.slice(1));
export const isDefenseRound = (round: number) => round > FORWARD_ROUNDS;

/** NHL points (G+A) last season: what boxes are tiered by. */
export const lastPts = (s: Stats | null | undefined) => (s?.g ?? 0) + (s?.a ?? 0);

/**
 * Split players into tiered boxes: best 10 forwards in round 1, next 10 in round 2, ...,
 * then the same for defensemen. Returns boxes[round - 1].
 */
export function buildBoxes<T extends { id: number; pos: Pos; last: Stats }>(players: T[]): T[][] {
  const rank = (a: T, b: T) => lastPts(b.last) - lastPts(a.last) || a.id - b.id;
  const fwd = players.filter((p) => p.pos !== "D").sort(rank);
  const def = players.filter((p) => p.pos === "D").sort(rank);
  const tiers = (list: T[], n: number) => Array.from({ length: n }, (_, i) => list.slice(i * BOX_SIZE, (i + 1) * BOX_SIZE));
  return [...tiers(fwd, FORWARD_ROUNDS), ...tiers(def, D_ROUNDS)];
}

export function points(s: Stats | null | undefined, k: Scoring) {
  if (!s) return 0;
  return (s.g ?? 0) * k.g + (s.a ?? 0) * k.a;
}

/** NHL positionCode → pool position; null for goalies. */
export function posFromCode(code: string): Pos | null {
  if (code === "G") return null;
  return code === "L" || code === "R" ? "W" : (code as Pos);
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
