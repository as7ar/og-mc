import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";

export async function GET() {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";
  const headers: Record<string, string> = {};
  if (env.BANKAPI_ADMIN_KEY) {
    headers["X-Admin-Key"] = env.BANKAPI_ADMIN_KEY;
  }

  try {
    const res = await fetch(`${baseUrl}/api/email-templates`, { cache: "no-store", headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "upstream_error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.BANKAPI_ADMIN_KEY) {
    headers["X-Admin-Key"] = env.BANKAPI_ADMIN_KEY;
  }

  const payload = await request.json();

  try {
    const res = await fetch(`${baseUrl}/api/email-templates`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "upstream_error" }, { status: 500 });
  }
}
