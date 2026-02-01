import { NextRequest, NextResponse } from "next/server";

const API_ENDPOINT = "https://discord.com/api/v10";
const CLIENT_ID = "1467492125191966780";
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = process.env.REDIRECT_URI!;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json(
            { description: "code not found" },
            { status: 400 }
        );
    }

    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
    });

    const tokenRes = await fetch(`${API_ENDPOINT}/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Authorization": `Basic ${Buffer.from(
                `${CLIENT_ID}:${CLIENT_SECRET}`
            ).toString("base64")}`,
        },
        body,
    });

    if (!tokenRes.ok) {
        return NextResponse.json(
            { description: "token exchange failed" },
            { status: tokenRes.status }
        );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch(`${API_ENDPOINT}/users/@me`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!userRes.ok) {
        return NextResponse.json(
            { description: "failed to fetch user" },
            { status: userRes.status }
        );
    }

    const user = await userRes.json();

    return NextResponse.json({
        user,
        avatar_url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=512`,
        oauth: {
            scope: tokenData.scope,
            expires_in: tokenData.expires_in,
        },
    });
}
