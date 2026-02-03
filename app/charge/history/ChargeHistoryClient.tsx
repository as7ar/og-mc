"use client";

import styles from "@/app/assets/styles/home.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DepositRequest = {
  requestId: string;
  playerName: string;
  depositorName: string;
  amount: number;
  status: string;
  createdAt: string;
  deadlineTimestamp: number;
};

type SessionUser = {
  discordId: string;
};

const sortOptions = {
  latest: "최신순",
  amountDesc: "금액 높은순",
  amountAsc: "금액 낮은순",
};

type SortKey = keyof typeof sortOptions;

type StatusKey = "all" | "pending" | "confirmed";

export default function ChargeHistoryClient() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = (searchParams.get("status") as StatusKey) || "all";
  const sortKey = (searchParams.get("sort") as SortKey) || "latest";
  const searchText = searchParams.get("q") || "";

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
    if (!user?.discordId) return;
    let mounted = true;
    const fetchRequests = async () => {
      setRequestsLoading(true);
      try {
        const res = await fetch("/api/bank/my-requests", { cache: "no-store" });
        const data = await res.json();
        if (mounted) {
          setRequests(res.ok ? data.requests || [] : []);
        }
      } catch {
        if (mounted) setRequests([]);
      } finally {
        if (mounted) setRequestsLoading(false);
      }
    };
    fetchRequests();
    return () => {
      mounted = false;
    };
  }, [user?.discordId]);

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

  const updateQuery = (next: { status?: StatusKey; sort?: SortKey; q?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.status) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    if (next.sort) {
      if (next.sort === "latest") params.delete("sort");
      else params.set("sort", next.sort);
    }
    if (typeof next.q === "string") {
      if (!next.q) params.delete("q");
      else params.set("q", next.q);
    }
    const qs = params.toString();
    router.replace(qs ? `/charge/history?${qs}` : "/charge/history");
  };

  const filteredRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    let list = requests.filter((req) => {
      const statusMatch = statusFilter === "all" ? true : req.status === statusFilter;
      if (!statusMatch) return false;
      if (!query) return true;
      return (
        req.requestId.toLowerCase().includes(query) ||
        req.playerName.toLowerCase().includes(query) ||
        req.depositorName.toLowerCase().includes(query)
      );
    });

    if (sortKey === "amountDesc") {
      list = [...list].sort((a, b) => b.amount - a.amount);
    } else if (sortKey === "amountAsc") {
      list = [...list].sort((a, b) => a.amount - b.amount);
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return list;
  }, [requests, statusFilter, searchText, sortKey]);

  return (
    <div className={styles.page} data-loaded="true" ref={rootRef}>
      <div className={styles.bg} />
      <div className={styles.overlay} />

      <main className={styles.contentMain}>
        <section className={`${styles.authSection} ${styles.reveal}`} data-reveal>
          <h3 className={styles.authHeading}>내 충전 요청 기록</h3>
          <p className={styles.authSub}>최근 충전 요청 상태를 확인합니다.</p>

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
            <>
              <div className={styles.requestFilters}>
                <div className={styles.filterItem}>
                  <label className={styles.depositLabel}>상태</label>
                  <select
                    className={styles.filterSelect}
                    value={statusFilter}
                    onChange={(e) => updateQuery({ status: e.target.value as StatusKey })}
                  >
                    <option value="all">전체</option>
                    <option value="pending">대기 중</option>
                    <option value="confirmed">충전 완료</option>
                  </select>
                </div>
                <div className={styles.filterItem}>
                  <label className={styles.depositLabel}>정렬</label>
                  <select
                    className={styles.filterSelect}
                    value={sortKey}
                    onChange={(e) => updateQuery({ sort: e.target.value as SortKey })}
                  >
                    <option value="latest">최신순</option>
                    <option value="amountDesc">금액 높은순</option>
                    <option value="amountAsc">금액 낮은순</option>
                  </select>
                </div>
                <div className={styles.filterItemWide}>
                  <label className={styles.depositLabel}>검색</label>
                  <input
                    className={styles.filterInput}
                    value={searchText}
                    onChange={(e) => updateQuery({ q: e.target.value })}
                    placeholder="요청 ID, 플레이어, 입금자"
                  />
                </div>
              </div>

              {requestsLoading ? (
                <div className={styles.userRow}>불러오는 중...</div>
              ) : filteredRequests.length === 0 ? (
                <div className={styles.loginError}>충전 요청 기록이 없습니다.</div>
              ) : (
                <div className={styles.requestList}>
                  {filteredRequests.map((req) => (
                    <div key={req.requestId} className={styles.requestCard}>
                      <div className={styles.requestRow}>
                        <span className={styles.requestId}>{req.requestId}</span>
                        <span
                          className={`${styles.requestStatus} ${
                            req.status === "confirmed" ? styles.requestStatusOk : styles.requestStatusPending
                          }`}
                        >
                          {req.status === "confirmed" ? "충전 완료" : "대기 중"}
                        </span>
                      </div>
                      <div className={styles.requestMeta}>
                        <span>금액: {req.amount.toLocaleString()}원</span>
                        <span>요청일: {new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                      {req.status === "confirmed" && (
                        <div className={styles.requestActions}>
                          <a
                            className={styles.requestInvoice}
                            href={`/api/bank/invoice/${req.requestId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            명세서 PDF
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
