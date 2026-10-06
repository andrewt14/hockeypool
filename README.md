# Puck Pool

Private NHL fantasy pool for 4 roommates. Next.js + Supabase + Vercel, stats from the free NHL API.

- **Standings** (`/`): ranked teams, points gained today, rank trend, last-updated time
- **Pick** (`/pick`): search, position filter and sort, one-tap add into the right slot, a draft tray (tap a player to remove), and "Also on" badges for roommates who picked the same player
- **Team** (`/team/[id]`) and **Player** (`/player/[id]`) pages
- **Settings**: switch team on this device; admin can edit team names/emojis, scoring, lock/unlock rosters, refresh stats, and reset a team's PIN

Box pool: 14 rounds, one pick per round. Rounds 1–10 are boxes of forwards and 11–14 are boxes of defensemen, tiered 10 players per box by last season's NHL points. No goalies. Scoring is goals and assists. Players aren't exclusive. Fantasy points are computed live from the saved scoring settings, so a scoring change applies to the whole season immediately.
