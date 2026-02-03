import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerEnv } from "@/app/lib/env";

const AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";

export async function GET() {
  const env = getServerEnv();
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: env.DISCORD_REDIRECT_URI,
    scope: "identify",
    state,
  });

  const redirectUrl = `${AUTHORIZE_URL}?${params.toString()}`;
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set("og_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
