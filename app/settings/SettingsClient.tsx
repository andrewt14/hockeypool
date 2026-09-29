"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { checkAdmin, refreshNow, resetTeamPin, saveScoring, saveTeam, setLocked } from "@/app/actions";
import { setMe, useMe } from "@/components/Shell";
import { LocalTime, PageHeader } from "@/components/ui";
import type { Settings } from "@/lib/db";

const SCORING = [
  ["g", "Goal"], ["a", "Assist"], ["w", "Goalie win"], ["so", "Shutout"], ["otl", "OT loss"],
] as const;

const card = "rounded-2xl border border-line bg-card p-4";
const input = "h-11 rounded-xl border border-line bg-ink px-3 outline-none focus:border-accent";
const btn = "h-11 rounded-xl px-4 font-semibold transition active:scale-95 disabled:opacity-40";

export default function SettingsClient({ settings }: { settings: Settings }) {
  const router = useRouter();
  const { me, teams } = useMe();
  const myTeam = teams.find((t) => t.id === me?.teamId);
  const [admin, setAdmin] = useState(""); // admin PIN, only kept for this page visit
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ error?: string }>, ok: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    setMsg(res.error ?? ok);
    if (!res.error) router.refresh();
  }

  return (
    <>
      <PageHeader kicker="Pool" title="Settings" />
      <div className="space-y-4 px-4">
        <section className={card}>
          <p className="text-xs font-bold tracking-widest text-mute uppercase">This device</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold">{myTeam ? `${myTeam.emoji} ${myTeam.name}` : "No team picked"}</p>
            <button onClick={() => setMe(null)} className={`${btn} border border-line`}>Switch team</button>
          </div>
        </section>

        {!admin ? (
          <form
            className={card}
            action={async (fd) => {
              const pin = String(fd.get("pin"));
              if (await checkAdmin(pin)) { setAdmin(pin); setMsg(""); } else setMsg("Wrong admin PIN");
            }}
          >
            <p className="text-xs font-bold tracking-widest text-mute uppercase">Admin</p>
            <div className="mt-2 flex gap-2">
              <input name="pin" type="password" inputMode="numeric" placeholder="Admin PIN" aria-label="Admin PIN" className={`${input} min-w-0 flex-1`} />
              <button className={`${btn} bg-accent`}>Unlock</button>
            </div>
            {msg && <p className="mt-2 text-sm text-accent-hi">{msg}</p>}
          </form>
        ) : (
          <>
            {msg && <p role="status" className="rounded-xl bg-panel px-4 py-3 text-sm">{msg}</p>}

            <section className={`${card} flex items-center justify-between gap-3`}>
              <div>
                <p className="font-semibold">Stats</p>
                <p className="text-xs text-mute">Last updated <LocalTime iso={settings.stats_updated_at} /></p>
              </div>
              <button disabled={busy} onClick={() => run(() => refreshNow(admin), "Stats refreshed")} className={`${btn} bg-accent`}>
                {busy ? "Working…" : "Refresh stats"}
              </button>
            </section>

            <section className={`${card} flex items-center justify-between gap-3`}>
              <div>
                <p className="font-semibold">{settings.locked ? "🔒 Rosters locked" : "🔓 Rosters open"}</p>
                <p className="text-xs text-mute">{settings.locked ? "Nobody can change their team." : "Everyone can edit their own team."}</p>
              </div>
              <button
                disabled={busy}
                onClick={() => run(() => setLocked(admin, !settings.locked), settings.locked ? "Rosters unlocked" : "Rosters locked")}
                className={`${btn} ${settings.locked ? "border border-line" : "bg-accent"}`}
              >
                {settings.locked ? "Unlock" : "Lock rosters"}
              </button>
            </section>

            <form
              className={card}
              action={(fd) => run(() => saveScoring(admin, Object.fromEntries(SCORING.map(([k]) => [k, Number(fd.get(k))])) as Settings["scoring"]), "Scoring saved")}
            >
              <p className="font-semibold">Scoring</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {SCORING.map(([k, label]) => (
                  <label key={k} className="text-xs text-mute">
                    {label}
                    <input name={k} type="number" step="0.5" inputMode="decimal" required defaultValue={settings.scoring[k]} className={`${input} mt-1 w-full text-white`} />
                  </label>
                ))}
              </div>
              <button disabled={busy} className={`${btn} mt-3 w-full bg-accent`}>Save scoring</button>
            </form>

            <section className={card}>
              <p className="font-semibold">Teams</p>
              <div className="mt-3 space-y-3">
                {teams.map((t) => (
                  <form key={t.id} className="flex flex-wrap gap-2" action={(fd) => run(() => saveTeam(admin, t.id, String(fd.get("name")), String(fd.get("emoji"))), `Saved ${fd.get("name")}`)}>
                    <input name="emoji" defaultValue={t.emoji} aria-label="Emoji" className={`${input} w-14 text-center text-2xl`} />
                    <input name="name" defaultValue={t.name} aria-label="Team name" maxLength={30} className={`${input} min-w-0 flex-1`} />
                    <button disabled={busy} className={`${btn} bg-accent`}>Save</button>
                    <button
                      type="button"
                      disabled={busy || !t.hasPin}
                      onClick={() => confirm(`Reset ${t.name}'s PIN? Next person to pick this team sets a new one.`) && run(() => resetTeamPin(admin, t.id), `${t.name} PIN reset`)}
                      className={`${btn} w-full border border-line text-sm text-mute`}
                    >
                      {t.hasPin ? "Reset PIN" : "No PIN set yet"}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
