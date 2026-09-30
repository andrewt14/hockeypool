"use server";
// Server actions are public endpoints: every argument is untrusted and re-validated here.
import { db, getPlayers, getSettings } from "@/lib/db";
import { refreshStats } from "@/lib/nhl";
import { RANKING } from "@/lib/rankings";
import { buildBoxes, ROUNDS, SLOTS, slotOf, type Scoring, type Slot } from "@/lib/pool";

type Result = { error?: string };
const isPin = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4}$/.test(pin);

async function teamPin(teamId: number) {
  const { data } = await db().from("teams").select("pin").eq("id", Number(teamId)).maybeSingle();
  return data; // null = no such team; { pin: null } = unclaimed
}

/** Log in as a team. First person to pick an unclaimed team sets its PIN. */
export async function claimTeam(teamId: number, pin: string): Promise<Result> {
  if (!isPin(pin)) return { error: "PIN must be 4 digits" };
  const t = await teamPin(teamId);
  if (!t) return { error: "No such team" };
  if (t.pin === null) {
    const { error } = await db().from("teams").update({ pin }).eq("id", Number(teamId)).is("pin", null);
    return error ? { error: error.message } : {};
  }
  return t.pin === pin ? {} : { error: "Wrong PIN" };
}

// ponytail: 4-digit PINs with no rate limit; fine among roommates, not against strangers.
async function guardRoster(teamId: number, pin: string): Promise<string | null> {
  const s = await getSettings();
  if (s.locked) return "Rosters are locked";
  const t = await teamPin(teamId);
  if (!t || !isPin(pin) || t.pin !== pin) return "Wrong PIN — switch team in Settings";
  const { count } = await db().from("rosters").select("slot", { count: "exact", head: true }).eq("team_id", Number(teamId));
  // Full rosters are final, except during the swap window (settings.swap_until).
  const swapping = !!s.swap_until && Date.now() < Date.parse(s.swap_until);
  return (count ?? 0) >= ROUNDS && !swapping ? "Your team is final — all picks are in" : null;
}

/** Set (or change) this team's pick for a round. The player must be in that round's box. */
export async function pickPlayer(teamId: number, pin: string, round: number, playerId: number): Promise<Result> {
  const bad = await guardRoster(teamId, pin);
  if (bad) return { error: bad };
  if (!Number.isInteger(round) || round < 1 || round > ROUNDS) return { error: "Bad round" };
  const box = buildBoxes(await getPlayers(), RANKING)[round - 1];
  if (!box.some((p) => p.id === Number(playerId))) return { error: `That player isn't in round ${round}` };
  const { error } = await db()
    .from("rosters")
    .upsert({ team_id: Number(teamId), slot: slotOf(round), player_id: Number(playerId) });
  return error ? { error: "Couldn't save pick, try again" } : {};
}

export async function removePlayer(teamId: number, pin: string, slot: Slot): Promise<Result> {
  const bad = await guardRoster(teamId, pin);
  if (bad) return { error: bad };
  if (!SLOTS.includes(slot)) return { error: "Bad slot" };
  const { error } = await db().from("rosters").delete().eq("team_id", Number(teamId)).eq("slot", slot);
  return error ? { error: error.message } : {};
}

// ---- admin ----

const isAdmin = (pin: string) => !!process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN;

async function admin(pin: string, fn: () => PromiseLike<{ error: { message: string } | null }>): Promise<Result> {
  if (!isAdmin(pin)) return { error: "Wrong admin PIN" };
  const { error } = await fn();
  return error ? { error: error.message } : {};
}

export async function checkAdmin(pin: string): Promise<boolean> {
  return isAdmin(pin);
}

export async function saveTeam(pin: string, id: number, name: string, emoji: string): Promise<Result> {
  name = String(name).trim().slice(0, 30);
  emoji = String(emoji).trim().slice(0, 8);
  if (!name || !emoji) return { error: "Name and emoji required" };
  return admin(pin, () => db().from("teams").update({ name, emoji }).eq("id", Number(id)));
}

export async function resetTeamPin(pin: string, id: number): Promise<Result> {
  return admin(pin, () => db().from("teams").update({ pin: null }).eq("id", Number(id)));
}

export async function saveScoring(pin: string, s: Scoring): Promise<Result> {
  const scoring = { g: +s.g, a: +s.a };
  if (Object.values(scoring).some((v) => !Number.isFinite(v))) return { error: "Scoring values must be numbers" };
  return admin(pin, () => db().from("settings").update({ scoring }).eq("id", 1));
}

export async function setLocked(pin: string, locked: boolean): Promise<Result> {
  return admin(pin, () => db().from("settings").update({ locked: !!locked }).eq("id", 1));
}

export async function refreshNow(pin: string): Promise<Result & { players?: number }> {
  if (!isAdmin(pin)) return { error: "Wrong admin PIN" };
  try {
    return await refreshStats();
  } catch (e) {
    return { error: (e as Error).message };
  }
}
