import { NextResponse } from "next/server";

import { isDemoSession } from "@/lib/demo-session";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { active: await isDemoSession() },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow, noarchive"
      }
    }
  );
}
