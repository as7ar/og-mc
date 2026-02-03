import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.discordId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";

  const body = await request.json();
  const payload = {
    playerName: body.playerName,
    depositorName: body.depositorName,
    amount: body.amount,
    discordUserId: session.discordId,
    minecraftName: body.minecraftName,
  };

  try {
    const res = await fetch(`${baseUrl}/api/deposit-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "upstream_error" }, { status: 500 });
  }
}
