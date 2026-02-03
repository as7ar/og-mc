import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function GET() {
  const session = await getSession();

  if (!session.discordId) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      discordId: session.discordId,
      username: session.username,
      displayName: session.displayName,
      avatarUrl: session.avatarUrl,
      isAdmin: session.isAdmin ?? false,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
