"use client";

import StaggeredMenu from "@/app/components/StaggeredMenu";
import React from "react";

export default function Header() {
  const [user, setUser] = React.useState<{
    discordId: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string;
    isAdmin?: boolean;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (!mounted) return;
        if (data?.authenticated) {
          setUser(data);
        } else {
          setUser(null);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const menuItems = [
    { label: "Home", ariaLabel: "Go to home page", link: "/" },
    { label: "충전 요청", ariaLabel: "Charge request page", link: "/charge" },
    { label: "충전 기록", ariaLabel: "Charge history page", link: "/charge/history" },
    { label: "Contact", ariaLabel: "Get in touch", link: "/contact" },
  ];

  const profileName = user?.displayName || user?.username || "Discord User";

  return (
    <>
      <div style={{ height: "0vh", background: "#1a1a1a" }}>
        <StaggeredMenu
          position="left"
          items={menuItems}
          displaySocials
          displayItemNumbering={true}
          menuButtonColor="#cbd5e1"
          openMenuButtonColor="#f4d7b0"
          changeMenuColorOnOpen={true}
          colors={["#a2ef9e", "#7f522a"]}
          accentColor="#7f522a"
          ctaLabel={!loading && !user ? "Discord로 로그인" : undefined}
          ctaLink={!loading && !user ? "/api/auth/discord" : undefined}
          ctaIcon={
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
            </svg>
          }
          onMenuOpen={() => console.log("Menu opened")}
          onMenuClose={() => console.log("Menu closed")}
        />
      </div>

      {user && (
        <div className="menu-profile-wrap">
          <div className="menu-profile">
            {user.avatarUrl && <img src={user.avatarUrl} alt="Discord Avatar" />}
            <div className="menu-profile-meta">
              <span className="menu-profile-name">{profileName}</span>
              <span className="menu-profile-id">ID {user.discordId}</span>
            </div>
            <div className="menu-profile-blur" />
            <button className="menu-profile-logout" type="button" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
          {user.isAdmin && (
            <a className="menu-profile-admin-card" href="/admin/charge">
              관리자 페이지
            </a>
          )}
        </div>
      )}
    </>
  );
}
