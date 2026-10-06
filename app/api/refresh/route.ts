import { refreshCurrentStats, refreshStats } from "@/lib/nhl";

// Both callers send `Authorization: Bearer $CRON_SECRET`:
// Vercel Cron once a day with ?full=1 (rosters, headshots, both seasons), and
// Supabase pg_cron every 15 min (job "refresh-stats") for just this season's stats.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const full = new URL(req.url).searchParams.has("full");
  return Response.json(await (full ? refreshStats() : refreshCurrentStats()));
}
