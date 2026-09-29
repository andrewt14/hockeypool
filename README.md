# Puck Pool

Private NHL fantasy pool for 4 roommates. Next.js + Supabase + Vercel, stats from the free NHL API.

- **Standings** (`/`): ranked teams, points gained today, rank trend, last-updated time
- **Pick** (`/pick`): search, position filter and sort, one-tap add into the right slot, a draft tray (tap a player to remove), and "Also on" badges for roommates who picked the same player
- **Team** (`/team/[id]`) and **Player** (`/player/[id]`) pages
- **Settings**: switch team on this device; admin can edit team names/emojis, scoring, lock/unlock rosters, refresh stats, and reset a team's PIN

Roster: 2 C, 2 W, 2 D, 1 G, 2 UTIL (any skater). Players aren't exclusive. Fantasy points are computed live from the saved scoring settings, so a scoring change applies to the whole season immediately.

## 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the tables, the 4 teams, and the default scoring.
3. From **Project Settings → API**, copy:
   - the **Project URL** → `SUPABASE_URL`
   - a **Secret key** (`sb_secret_…`; or the legacy `service_role` key) → `SUPABASE_SECRET_KEY`

The secret key is only used on the server. RLS is on with no policies, so the public anon key can't read anything.

## 2. Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

Then open **Settings**, enter the admin PIN, and tap **Refresh stats** (about 15 s). That loads every player from the NHL rosters, plus this season's and last season's stats.

`npm test` runs the checks for slot filling and scoring.

## 3. Deploy on Vercel

1. Push this repo to GitHub, then **Add New → Project** on [vercel.com](https://vercel.com) and import it. It's detected as Next.js automatically.
2. Under **Settings → Environment Variables**, add all four variables from `.env.example`:
   - `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
   - `ADMIN_PIN`: whatever you want the admin PIN to be
   - `CRON_SECRET`: any long random string (`openssl rand -hex 32`). Vercel sends it to the cron route automatically.
3. Deploy. `vercel.json` schedules `/api/refresh` daily at 10:00 UTC (6 AM Eastern, after the night's games). Check it under **Settings → Cron Jobs**.

## How to use it

- On first visit, each roommate picks their team. The first person to pick a team creates its 4-digit PIN, and it's saved on that device. Lost your PIN? The admin can reset it in Settings.
- Draft on the **Pick** tab until everyone has 9, then the admin hits **Lock rosters**.
- "Today" and the trend arrows compare against the previous day's snapshot, which is saved on each refresh. They start showing movement after the second daily refresh.

## Each new season

Update `SEASON` and `LAST_SEASON` at the top of `lib/nhl.ts` (e.g. `20272028` / `20262027`), unlock rosters, and clear the old picks: `delete from rosters; delete from snapshots;`.
