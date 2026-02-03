"use client";

import styles from "@/app/assets/styles/home.module.css";
import Image from "next/image";
import logo from "./assets/images/og.png";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type SessionUser = {
  discordId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
};

type DepositResult = {
  success?: boolean;
  requestId?: string;
  deadlineTimestamp?: number;
  amount?: number;
  account?: {
    bank?: string;
    number?: string;
    name?: string;
  };
  error?: string;
};

type DepositRequest = {
  requestId: string;
  playerName: string;
  depositorName: string;
  amount: number;
  status: string;
  createdAt: string;
  deadlineTimestamp: number;
};

export default function HomeClient() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [depositForm, setDepositForm] = useState({
    playerName: "",
    depositorName: "",
    amount: "",
    minecraftName: "",
  });
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<DepositRequest[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setPageLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!user?.discordId) return;
    let mounted = true;
    const fetchMyRequests = async () => {
      setMyRequestsLoading(true);
      try {
        const res = await fetch("/api/bank/my-requests", { cache: "no-store" });
        const data = await res.json();
        if (mounted) {
          setMyRequests(res.ok ? data.requests || [] : []);
        }
      } catch {
        if (mounted) setMyRequests([]);
      } finally {
        if (mounted) setMyRequestsLoading(false);
      }
    };
    fetchMyRequests();
    return () => {
      mounted = false;
    };
  }, [user?.discordId]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) {
      setErrorMessage(null);
      return;
    }
    const map: Record<string, string> = {
      state: "로그인 상태가 유효하지 않습니다. 다시 시도해주세요.",
      token: "디스코드 인증에 실패했습니다. 잠시 후 다시 시도해주세요.",
      user: "유저 정보를 가져오지 못했습니다. 다시 로그인해주세요.",
      server: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
    setErrorMessage(map[error] ?? "로그인 중 오류가 발생했습니다.");
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!mounted) return;
        if (res.ok) {
          const data = (await res.json()) as SessionUser;
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
    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll("[data-reveal]"));
    if (elements.length === 0) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      elements.forEach((el) => el.classList.add(styles.revealVisible));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const maskedId = useMemo(() => {
    if (!user?.discordId) return "";
    const id = user.discordId;
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  }, [user?.discordId]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const handleDepositChange = (field: string, value: string) => {
    setDepositForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDepositSubmit = async () => {
    setDepositLoading(true);
    setDepositResult(null);

    try {
      const res = await fetch("/api/bank/deposit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: depositForm.playerName,
          depositorName: depositForm.depositorName,
          amount: depositForm.amount,
          minecraftName: depositForm.minecraftName,
        }),
      });
      const data = await res.json();
      setDepositResult(data);
      if (user?.discordId) {
        const listRes = await fetch("/api/bank/my-requests", { cache: "no-store" });
        const listData = await listRes.json();
        if (listRes.ok) setMyRequests(listData.requests || []);
      }
    } catch (error: any) {
      setDepositResult({ error: error?.message || "요청 실패" });
    } finally {
      setDepositLoading(false);
    }
  };

  return (
    <div className={styles.page} data-loaded={pageLoaded} ref={rootRef}>
      <div className={styles.bg} />
      <div className={styles.overlay} />

      <main className={styles.main}>
        <div className={`${styles.hero} ${styles.reveal}`} data-reveal>
          <span className={styles.heroBadge}>EST. 2026</span>
          <div className={`${styles.imageWrap} ${styles.reveal}`} data-reveal>
            <Image
              src={logo}
              alt="OG LOGO"
              width={320}
              height={320}
              className={styles.logo}
            />
            <div className={styles.glow} />
          </div>

          <div className={`${styles.textBox} ${styles.reveal}`} data-reveal>
            <h2 className={styles.title}>OG SERVER</h2>
            <p className={styles.desc}>
              더 나은 경험과 함께하는 정통 서버 커뮤니티
            </p>
          </div>
        </div>

        <div className={`${styles.heroActions} ${styles.reveal}`} data-reveal>
          <a href="#about" className={`${styles.btn} ${styles.btnPrimary}`}>서버 소개 보기</a>
          <a href="/contact" className={`${styles.btn} ${styles.btnSecondary}`}>CONTACT</a>
        </div>

        <section id="about" className={`${styles.section} ${styles.reveal}`} data-reveal>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>About Server</h2>
              <p className={styles.sectionDesc}>안정적인 운영과 공정한 규칙을 최우선으로 합니다.</p>
            </div>

            <div className={styles.grid3}>
              <div className={`${styles.card} ${styles.reveal}`} data-reveal>
                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                <h3 className={styles.cardTitle}>안정적인 운영</h3>
                <p className={styles.cardText}>최적화된 인프라와 체계적인 업데이트로 안정성을 지킵니다.</p>
              </div>

              <div className={`${styles.card} ${styles.reveal}`} data-reveal>
                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                <h3 className={styles.cardTitle}>커뮤니티 중심</h3>
                <p className={styles.cardText}>서로 존중하는 문화를 만들고 활발한 소통을 지원합니다.</p>
              </div>

              <div className={`${styles.card} ${styles.reveal}`} data-reveal>
                <div className={`${styles.cardIcon} ${styles.iconStable}`}></div>
                <h3 className={styles.cardTitle}>공정한 규칙</h3>
                <p className={styles.cardText}>투명한 정책과 일관된 운영으로 균형을 유지합니다.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.authSection} ${styles.reveal}`} data-reveal>
          <h3 className={styles.authHeading}>Discord 로그인</h3>
          <p className={styles.authSub}>
            OG 서버 멤버 전용 인증을 진행합니다.
          </p>

          {loading ? (
            <div className={styles.userRow}>로딩 중...</div>
          ) : user ? (
            <div className={styles.userCard}>
              <div className={styles.userRow}>
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt="Discord Avatar"
                    className={styles.userAvatar}
                  />
                )}
                <div className={styles.userMeta}>
                  <span className={styles.userName}>
                    {user.displayName ?? user.username ?? "Discord User"}
                  </span>
                  <span className={styles.userId}>ID {maskedId}</span>
                </div>
                {user.isAdmin && <span className={styles.adminBadge}>ADMIN</span>}
              </div>
              <div className={styles.authActions}>
                <button className={styles.logoutButton} onClick={handleLogout} type="button">
                  로그아웃
                </button>
                {user.isAdmin && (
                  <a className={styles.adminLink} href="/admin/charge">
                    충전 관리자
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.authActions}>
              <a href="/api/auth/discord" className={styles.discordButton}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463.-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.3 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                </svg>
                Discord로 로그인
              </a>
            </div>
          )}

          {errorMessage && <div className={styles.loginError}>{errorMessage}</div>}
        </section>

        <section className={`${styles.authSection} ${styles.reveal}`} data-reveal>
          <h3 className={styles.authHeading}>캐쉬 충전 요청</h3>
          <p className={styles.authSub}>디스코드 로그인 후 요청 가능합니다.</p>

          {!user ? (
            <div className={styles.loginError}>로그인 후 이용할 수 있습니다.</div>
          ) : (
            <div className={styles.depositGrid}>
              <div className={styles.depositField}>
                <label className={styles.depositLabel}>플레이어명</label>
                <input
                  className={styles.depositInput}
                  value={depositForm.playerName}
                  onChange={(e) => handleDepositChange("playerName", e.target.value)}
                  placeholder="플레이어명"
                />
              </div>
              <div className={styles.depositField}>
                <label className={styles.depositLabel}>입금자명</label>
                <input
                  className={styles.depositInput}
                  value={depositForm.depositorName}
                  onChange={(e) => handleDepositChange("depositorName", e.target.value)}
                  placeholder="입금자명"
                />
              </div>
              <div className={styles.depositField}>
                <label className={styles.depositLabel}>금액</label>
                <input
                  className={styles.depositInput}
                  type="number"
                  value={depositForm.amount}
                  onChange={(e) => handleDepositChange("amount", e.target.value)}
                  placeholder="10000"
                />
              </div>
              <div className={styles.depositField}>
                <label className={styles.depositLabel}>OG서버 한글 닉네임(선택)</label>
                <input
                  className={styles.depositInput}
                  value={depositForm.minecraftName}
                  onChange={(e) => handleDepositChange("minecraftName", e.target.value)}
                  placeholder="한글닉네임"
                />
              </div>
              <button
                className={styles.depositButton}
                type="button"
                onClick={handleDepositSubmit}
                disabled={depositLoading}
              >
                {depositLoading ? "요청 중..." : "충전 요청"}
              </button>

              {depositResult && (
                <div className={styles.depositResult}>
                  {depositResult.error && <span>오류: {depositResult.error}</span>}
                  {depositResult.requestId && (
                    <div>
                      <div>요청 ID: {depositResult.requestId}</div>
                      {depositResult.deadlineTimestamp && (
                        <div>마감 시간: {new Date(depositResult.deadlineTimestamp).toLocaleString()}</div>
                      )}
                      {depositResult.account?.number ? (
                        <div className={styles.depositAccount}>
                          입금 계좌: {depositResult.account.bank} {depositResult.account.number} ({depositResult.account.name})
                        </div>
                      ) : (
                        <div className={styles.depositAccount}>입금 계좌가 설정되지 않았습니다.</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <section className={`${styles.authSection} ${styles.reveal}`} data-reveal>
          <h3 className={styles.authHeading}>내 충전 요청 기록</h3>
          <p className={styles.authSub}>최근 충전 요청 상태를 확인합니다.</p>

          {!user ? (
            <div className={styles.loginError}>로그인 후 이용할 수 있습니다.</div>
          ) : myRequestsLoading ? (
            <div className={styles.userRow}>불러오는 중...</div>
          ) : myRequests.length === 0 ? (
            <div className={styles.loginError}>충전 요청 기록이 없습니다.</div>
          ) : (
            <div className={styles.requestList}>
              {myRequests.map((req) => (
                <div key={req.requestId} className={styles.requestCard}>
                  <div className={styles.requestRow}>
                    <span className={styles.requestId}>{req.requestId}</span>
                    <span className={`${styles.requestStatus} ${req.status === "confirmed" ? styles.requestStatusOk : styles.requestStatusPending}`}>
                      {req.status === "confirmed" ? "충전 완료" : "대기 중"}
                    </span>
                  </div>
                  <div className={styles.requestMeta}>
                    <span>금액: {req.amount.toLocaleString()}원</span>
                    <span>요청일: {new Date(req.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
