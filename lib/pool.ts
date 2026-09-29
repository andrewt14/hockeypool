// Pure pool rules, shared by client and server. No imports so `node --test` can load it directly.

export type Pos = "C" | "W" | "D"; // skaters only; goalies aren't in the pool
export type Stats = { gp?: number; g?: number; a?: number };
export type Scoring = { g: number; a: number };

export const DEFAULT_SCORING: Scoring = { g: 1, a: 1 };

// 7 forwards (any C or W) + 3 defense.
export const SLOTS = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "D1", "D2", "D3"] as const;
export type Slot = (typeof SLOTS)[number];

export function slotAccepts(slot: Slot, pos: Pos) {
  return slot[0] === "D" ? pos === "D" : pos !== "D";
}

/** First open slot for this position. null = no room. */
export function pickSlot(pos: Pos, filled: Iterable<string>): Slot | null {
  const taken = new Set(filled);
  return SLOTS.find((s) => !taken.has(s) && slotAccepts(s, pos)) ?? null;
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
