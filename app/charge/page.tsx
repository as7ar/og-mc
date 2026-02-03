"use client";

import styles from "@/app/assets/styles/home.module.css";
import { useEffect, useMemo, useRef, useState } from "react";

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

export default function ChargePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [depositForm, setDepositForm] = useState({
    playerName: "",
    depositorName: "",
    amount: "",
    minecraftName: "",
  });
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!mounted) return;
        const data = await res.json();
        if (data?.authenticated) {
          setUser(data as SessionUser);
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
      { threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
    } catch (error: any) {
      setDepositResult({ error: error?.message || "요청 실패" });
    } finally {
      setDepositLoading(false);
    }
  };

  const maskedId = useMemo(() => {
    if (!user?.discordId) return "";
    const id = user.discordId;
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  }, [user?.discordId]);

  return (
    <div className={styles.page} data-loaded="true" ref={rootRef}>
      <div className={styles.bg} />
      <div className={styles.overlay} />

      <main className={styles.contentMain}>
        <section className={`${styles.authSection} ${styles.reveal}`} data-reveal>
          <h3 className={styles.authHeading}>캐쉬 충전 요청</h3>
          <p className={styles.authSub}>디스코드 로그인 후 요청 가능합니다.</p>

          {loading ? (
            <div className={styles.userRow}>로딩 중...</div>
          ) : !user ? (
            <div className={styles.userCard}>
              <div className={styles.loginError}>디스코드 로그인이 필요합니다.</div>
              <div className={styles.authActions}>
                <a href="/api/auth/discord" className={styles.discordButton}>
                  Discord로 로그인
                </a>
              </div>
            </div>
          ) : (
            <div className={styles.userCard}>
              <div className={styles.userRow}>
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="Discord Avatar" className={styles.userAvatar} />
                )}
                <div className={styles.userMeta}>
                  <span className={styles.userName}>{user.displayName ?? user.username ?? "Discord User"}</span>
                  <span className={styles.userId}>ID {maskedId}</span>
                </div>
              </div>
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
                  <label className={styles.depositLabel}>마인크래프트 닉네임(선택)</label>
                  <input
                    className={styles.depositInput}
                    value={depositForm.minecraftName}
                    onChange={(e) => handleDepositChange("minecraftName", e.target.value)}
                    placeholder="닉네임"
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
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
