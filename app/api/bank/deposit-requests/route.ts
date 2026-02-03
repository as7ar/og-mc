import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";

  try {
    const res = await fetch(`${baseUrl}/api/deposit-requests${qs}`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "upstream_error" }, { status: 500 });
  }
}
