import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";

export async function POST() {
  const session = await getSession();
  await session.destroy();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  await session.destroy();
  return NextResponse.redirect("/");
}
