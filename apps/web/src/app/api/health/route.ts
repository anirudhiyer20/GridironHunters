import { NextResponse } from "next/server";

import { getProjectHost, hasSupabaseEnv } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    app: "GridironHunters",
    status: "ok",
    supabaseConfigured: hasSupabaseEnv,
    projectHost: getProjectHost(),
  });
}
