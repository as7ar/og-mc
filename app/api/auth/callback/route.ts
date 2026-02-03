import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/app/lib/env";
import { getSession } from "@/app/lib/session";
import { isAdminDiscordId } from "@/app/lib/admin";

const API_ENDPOINT = "https://discord.com/api/v10";

function buildAvatarUrl(user: { id: string; avatar?: string | null; discriminator?: string | null }) {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=256`;
  }
  const discriminatorNum = Number(user.discriminator ?? "0");
  const fallbackIndex = Number.isNaN(discriminatorNum) ? Number(user.id) % 5 : discriminatorNum % 5;
  return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
}

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const stateCookie = request.cookies.get("og_oauth_state")?.value;
  const baseUrl = env.BASE_URL ?? origin;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    const response = NextResponse.redirect(`${baseUrl}/login?error=state`);
    response.cookies.set("og_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  }

  try {
    const body = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    });

    const tokenRes = await fetch(`${API_ENDPOINT}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("[auth] Discord token exchange failed:", tokenRes.status, errorText);
      const response = NextResponse.redirect(`${baseUrl}/login?error=token`);
      response.cookies.set("og_oauth_state", "", { maxAge: 0, path: "/" });
      return response;
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string | undefined;

    if (!accessToken) {
      const response = NextResponse.redirect(`${baseUrl}/login?error=token`);
      response.cookies.set("og_oauth_state", "", { maxAge: 0, path: "/" });
      return response;
    }

    const userRes = await fetch(`${API_ENDPOINT}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      const response = NextResponse.redirect(`${baseUrl}/login?error=user`);
      response.cookies.set("og_oauth_state", "", { maxAge: 0, path: "/" });
      return response;
    }

    const user = (await userRes.json()) as {
      id: string;
      username: string;
      global_name?: string | null;
      display_name?: string | null;
      avatar?: string | null;
      discriminator?: string | null;
    };

    const displayName = user.global_name ?? user.display_name ?? user.username;
    const avatarUrl = buildAvatarUrl(user);

    const session = await getSession();
    session.discordId = user.id;
    session.username = user.username;
    session.displayName = displayName;
    session.avatarUrl = avatarUrl;
    session.isAdmin = isAdminDiscordId(user.id);
    await session.save();

    const response = NextResponse.redirect(`${baseUrl}/?login=success`);
    response.cookies.set("og_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    console.error("[auth] Discord OAuth callback failed", error);
    const response = NextResponse.redirect(`${baseUrl}/login?error=server`);
    response.cookies.set("og_oauth_state", "", { maxAge: 0, path: "/" });
    return response;
  }
}
