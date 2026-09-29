// Pure pool rules, shared by client and server. No imports so `node --test` can load it directly.

export type Pos = "C" | "W" | "D" | "G";
export type Stats = { gp?: number; g?: number; a?: number; w?: number; so?: number; otl?: number };
export type Scoring = { g: number; a: number; w: number; so: number; otl: number };

export const DEFAULT_SCORING: Scoring = { g: 1, a: 1, w: 2, so: 3, otl: 1 };

export const SLOTS = ["C1", "C2", "W1", "W2", "D1", "D2", "G1", "U1", "U2"] as const;
export type Slot = (typeof SLOTS)[number];

export function slotAccepts(slot: Slot, pos: Pos) {
  const kind = slot[0];
  return kind === "U" ? pos !== "G" : kind === pos;
}

/** First open slot for this position, falling back to Utility for skaters. null = no room. */
export function pickSlot(pos: Pos, filled: Iterable<string>): Slot | null {
  const taken = new Set(filled);
  const open = SLOTS.filter((s) => !taken.has(s) && slotAccepts(s, pos));
  return open.find((s) => s[0] === pos) ?? open[0] ?? null;
}

export function points(s: Stats | null | undefined, k: Scoring) {
  if (!s) return 0;
  return (s.g ?? 0) * k.g + (s.a ?? 0) * k.a + (s.w ?? 0) * k.w + (s.so ?? 0) * k.so + (s.otl ?? 0) * k.otl;
}

export function posFromCode(code: string): Pos {
  return code === "L" || code === "R" ? "W" : (code as Pos);
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
