"use client";
/* eslint-disable @next/next/no-img-element -- NHL CDN images, no optimizer needed */
import { useState } from "react";
import type { Pos } from "@/lib/pool";

const POS_STYLE: Record<string, string> = {
  C: "bg-sky-500/20 text-sky-300",
  W: "bg-emerald-500/20 text-emerald-300",
  D: "bg-amber-500/20 text-amber-300",
  G: "bg-fuchsia-500/20 text-fuchsia-300",
  U: "bg-slate-500/25 text-slate-300",
};

export function PosBadge({ pos }: { pos: Pos | "U" }) {
  return (
    <span className={`inline-flex h-5 min-w-7 items-center justify-center rounded px-1.5 font-display text-xs font-bold ${POS_STYLE[pos]}`}>
      {pos === "U" ? "UTIL" : pos}
    </span>
  );
}

export function Headshot({ src, name, size = 56 }: { src: string | null; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-line to-card"
      style={{ width: size, height: size }}
    >
      {src && !broken ? (
        <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display font-bold text-mute">{initials}</span>
      )}
    </div>
  );
}

export function TeamLogo({ abbr, size = 20 }: { abbr: string; size?: number }) {
  return (
    <img
      src={`https://assets.nhle.com/logos/nhl/svg/${abbr}_dark.svg`}
      alt={abbr}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0"
    />
  );
}

/** Timestamp rendered in the viewer's own timezone. */
export function LocalTime({ iso }: { iso: string | null }) {
  if (!iso) return <>never</>;
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
    </time>
  );
}

export function PageHeader({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="px-4 pt-6 pb-3">
      {kicker && <p className="font-display text-xs font-bold uppercase tracking-widest text-accent">{kicker}</p>}
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-bold leading-tight">{title}</h1>
        {children}
      </div>
    </header>
  );
}
