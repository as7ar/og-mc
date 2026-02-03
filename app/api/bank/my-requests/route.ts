import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";

export async function GET() {
  const session = await getSession();
  if (!session.discordId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";

  try {
    const res = await fetch(`${baseUrl}/api/deposit-requests`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    const list = (data.requests || []).filter((r: any) => r.discordUserId === session.discordId);
    return NextResponse.json({ success: true, count: list.length, requests: list });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "upstream_error" }, { status: 500 });
  }
}
