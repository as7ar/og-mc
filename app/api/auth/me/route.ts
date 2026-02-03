import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session.discordId) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      discordId: session.discordId,
      username: session.username,
      displayName: session.displayName,
      avatarUrl: session.avatarUrl,
      isAdmin: session.isAdmin ?? false,
      email: session.email,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
