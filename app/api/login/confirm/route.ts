import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        const error = encodeURIComponent("로그인 코드를 가져올 수 없습니다");
        return NextResponse.redirect(
            new URL(`/login?error=${error}`, request.url)
        );
    }

    const loginRes = await fetch(
        new URL(`/api/login?code=${code}`, request.url),
        { method: "GET" }
    );

    if (!loginRes.ok) {
        const error = encodeURIComponent("로그인 처리 중 오류가 발생했습니다");
        return NextResponse.redirect(
            new URL(`/login?error=${error}`, request.url)
        );
    }

    const user = await loginRes.json();

    const response = NextResponse.redirect(new URL("/", request.url));

    const loginSession = {
        nickname: user.user.username,
        avatar_url: user.avatar_url,
    };
    response.cookies.set("login_session", JSON.stringify(loginSession), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
    });
    NextResponse.redirect('/')

    return response;
}
