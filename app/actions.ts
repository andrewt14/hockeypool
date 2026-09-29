"use server";
// Server actions are public endpoints: every argument is untrusted and re-validated here.
import { db, getSettings } from "@/lib/db";
import { refreshStats } from "@/lib/nhl";
import { pickSlot, SLOTS, type Pos, type Scoring, type Slot } from "@/lib/pool";

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
  if ((await getSettings()).locked) return "Rosters are locked";
  const t = await teamPin(teamId);
  return t && isPin(pin) && t.pin === pin ? null : "Wrong PIN — switch team in Settings";
}

export async function addPlayer(teamId: number, pin: string, playerId: number): Promise<Result & { slot?: Slot }> {
  const bad = await guardRoster(teamId, pin);
  if (bad) return { error: bad };
  const [{ data: player }, { data: roster }] = await Promise.all([
    db().from("players").select("pos").eq("id", Number(playerId)).maybeSingle(),
    db().from("rosters").select("slot,player_id").eq("team_id", Number(teamId)),
  ]);
  if (!player || !roster) return { error: "Player not found" };
  if (roster.some((r) => r.player_id === Number(playerId))) return { error: "Already on your roster" };
  const slot = pickSlot(player.pos as Pos, roster.map((r) => r.slot));
  if (!slot) return { error: `No open ${player.pos === "G" ? "G" : player.pos + " or UTIL"} slot` };
  const { error } = await db().from("rosters").insert({ team_id: Number(teamId), slot, player_id: Number(playerId) });
  return error ? { error: "Roster changed, try again" } : { slot };
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
  const scoring = { g: +s.g, a: +s.a, w: +s.w, so: +s.so, otl: +s.otl };
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
