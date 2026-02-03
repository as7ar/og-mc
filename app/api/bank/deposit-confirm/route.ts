import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";

  const body = await request.json();
  const payload = { requestId: body.requestId };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.BANKAPI_ADMIN_KEY) {
    headers["X-Admin-Key"] = env.BANKAPI_ADMIN_KEY;
  }

  try {
    const res = await fetch(`${baseUrl}/api/deposit-confirm`, {
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
