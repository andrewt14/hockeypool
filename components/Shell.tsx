"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { claimTeam } from "@/app/actions";
import type { Team } from "@/lib/db";

type Me = { teamId: number; pin: string };
const KEY = "pool-me";
const EVT = "pool-me-change";

// Which team this device is, stored in localStorage and read without a hydration mismatch.
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVT, cb);
  };
}
const read = () => {
  try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; }
};
export function setMe(me: Me | null) {
  try {
    if (me) localStorage.setItem(KEY, JSON.stringify(me));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

const Ctx = createContext<{ me: Me | null; teams: Team[] }>({ me: null, teams: [] });
export const useMe = () => useContext(Ctx);

export default function Shell({ teams, children }: { teams: Team[]; children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => null); // null on server/first paint
  const me: Me | null = raw ? JSON.parse(raw) : null;
  return (
    <Ctx.Provider value={{ me, teams }}>
      <div className="status-cover" aria-hidden />
      <main className="pb-nav mx-auto max-w-5xl">{children}</main>
      <BottomNav me={me} />
      {raw === "" && <TeamGate teams={teams} />}
    </Ctx.Provider>
  );
}

function BottomNav({ me }: { me: Me | null }) {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Standings", icon: "M4 20h4V10H4zm6 0h4V4h-4zm6 0h4v-7h-4z" },
    { href: "/pick", label: "Pick", icon: "M12 5v14M5 12h14" },
    { href: me ? `/team/${me.teamId}` : "/", label: "My Team", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0" },
    { href: "/settings", label: "Settings", icon: "M4 6h16M4 12h16M4 18h16" },
  ];
  const active = (href: string, label: string) =>
    label === "My Team" ? path === href : href === "/" ? path === "/" : path.startsWith(href);
  return (
    <nav className="bottom-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((t) => {
          const on = active(t.href, t.label);
          return (
            <li key={t.label}>
              <Link
                href={t.href}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${on ? "text-accent-hi" : "text-mute"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TeamGate({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;
    setBusy(true);
    const res = await claimTeam(team.id, pin);
    setBusy(false);
    if (res.error) return setError(res.error);
    setMe({ teamId: team.id, pin });
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/90 backdrop-blur-sm sm:items-center">
      <div className="animate-rise w-full max-w-md rounded-t-3xl border border-line bg-panel p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl">
        <p className="font-display text-sm font-bold uppercase tracking-widest text-accent">Puck Pool</p>
        {!team ? (
          <>
            <h2 className="mt-1 font-display text-3xl font-bold">Which team are you?</h2>
            <p className="mt-1 text-sm text-mute">Saved on this device.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTeam(t)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-4 transition active:scale-95"
                >
                  <span className="text-4xl">{t.emoji}</span>
                  <span className="font-semibold">{t.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 className="mt-1 font-display text-3xl font-bold">
              {team.emoji} {team.name}
            </h2>
            <label className="mt-4 block text-sm text-mute" htmlFor="pin">
              {team.hasPin
                ? "Enter your team PIN (the one you made, not the admin PIN)"
                : "Make up a 4-digit PIN for your team. You'll use it to make picks on other devices."}
            </label>
            <input
              id="pin"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
              className="mt-2 w-full rounded-xl border border-line bg-ink px-4 py-3 text-center font-display text-3xl tracking-[0.6em] outline-none focus:border-accent"
            />
            {error && <p className="mt-2 text-sm text-accent-hi">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => { setTeam(null); setPin(""); setError(""); }} className="h-12 flex-1 rounded-xl border border-line font-semibold">
                Back
              </button>
              <button disabled={pin.length !== 4 || busy} className="h-12 flex-[2] rounded-xl bg-accent font-bold disabled:opacity-40">
                {busy ? "…" : team.hasPin ? "Let me in" : "Claim team"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
