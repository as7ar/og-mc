"use client";

import React from "react";

const redirect = encodeURIComponent(
    process.env.NEXT_PUBLIC_REDIRECT_URI!
);

const loginUrl =
    `https://discord.com/oauth2/authorize` +
    `?client_id=1467492125191966780` +
    `&response_type=code` +
    `&redirect_uri=${redirect}` +
    `&scope=email+identify+guilds.join+openid+guilds`;

export default function LoginClient() {
    /*const searchParams = useSearchParams();
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setError(searchParams.get("error"));
    }, [searchParams]);*/

    return (
        <div className="login-page">
            <div className="login-bg" />
            <div className="login-overlay" />

            <main className="login-main">
                <a className="login-back" href={"/"}>← 메인으로 돌아가기</a>

                <div className="login-box">
                    <h1 className="login-title">LOGIN</h1>
                    <p className="login-desc">Discord 계정으로 로그인하세요</p>

                    {/*{error && (
                        <div className="login-alert">
                            <span>로그인 중 오류가 발생했습니다.</span>
                            <span>{error}</span>
                            <button onClick={() => setError(null)}>×</button>
                        </div>
                    )}*/}

                    <a href={loginUrl} className="discord-login">
                        <span>Login with Discord</span>
                    </a>
                </div>
            </main>
        </div>
    );
}
