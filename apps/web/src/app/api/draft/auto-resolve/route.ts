import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { leagueId?: string }
    | null;

  const leagueId = body?.leagueId?.trim();

  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("process_live_draft_queue", {
    p_league_id: leagueId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ processedCount: data ?? 0 });
}
