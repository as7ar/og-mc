"use client";

import "../../assets/styles/admin-charge.css";
import { useEffect, useMemo, useState } from "react";

type SessionUser = {
  discordId: string;
  isAdmin?: boolean;
};

type DepositRequest = {
  requestId: string;
  playerName: string;
  depositorName: string;
  amount: number;
  discordUserId: string;
  createdAt: string;
  deadlineTimestamp: number;
  status: string;
  minecraftName?: string | null;
};

const statusLabel: Record<string, string> = {
  pending: "대기",
  confirmed: "완료",
};

type BankConfig = {
  depositMinAmount: number;
  depositMaxAmount: number;
  depositUnitAmount: number;
  bankAccountBank: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

export default function AdminChargePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [fetching, setFetching] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [selected, setSelected] = useState<DepositRequest | null>(null);
  const [config, setConfig] = useState<BankConfig | null>(null);
  const [configForm, setConfigForm] = useState<BankConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
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
    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchRequests = async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const qs = params.toString();
      const res = await fetch(`/api/bank/deposit-requests${qs ? `?${qs}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "목록 조회 실패");
      }
      setRequests(data.requests || []);
    } catch (e: any) {
      setError(e?.message || "목록 조회 오류");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchRequests();
    }
  }, [user?.isAdmin, statusFilter]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/bank/config", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "설정 조회 실패");
      }
      setConfig(data);
      setConfigForm(data);
    } catch (e: any) {
      setError(e?.message || "설정 조회 오류");
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchConfig();
    }
  }, [user?.isAdmin]);

  const confirmRequest = async (requestId: string) => {
    setConfirmingId(requestId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/bank/deposit-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "승인 실패");
      }
      setSuccess("충전 완료 처리되었습니다.");
      if (statusFilter === "pending") {
        setStatusFilter("confirmed");
      }
      await fetchRequests();
    } catch (e: any) {
      setError(e?.message || "승인 오류");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "requestId",
      "playerName",
      "depositorName",
      "amount",
      "discordUserId",
      "minecraftName",
      "status",
      "createdAt",
      "deadlineTimestamp",
    ];

    const rows = filteredRequests.map((r) => [
      r.requestId,
      r.playerName,
      r.depositorName,
      r.amount,
      r.discordUserId,
      r.minecraftName || "",
      r.status,
      r.createdAt,
      r.deadlineTimestamp,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const str = String(value ?? "");
            const escaped = str.replace(/"/g, "\"\"");
            return `"${escaped}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deposit-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filteredRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((r) => {
      return (
        r.requestId.toLowerCase().includes(query) ||
        r.playerName.toLowerCase().includes(query) ||
        r.depositorName.toLowerCase().includes(query) ||
        r.discordUserId.toLowerCase().includes(query) ||
        (r.minecraftName || "").toLowerCase().includes(query)
      );
    });
  }, [requests, searchText]);

  const handleConfigChange = (field: keyof BankConfig, value: string) => {
    setConfigForm((prev) => {
      if (!prev) return prev;
      if (field === "depositMinAmount" || field === "depositMaxAmount" || field === "depositUnitAmount") {
        return { ...prev, [field]: Number(value) };
      }
      return { ...prev, [field]: value };
    });
  };

  const saveConfig = async () => {
    if (!configForm) return;
    setConfigSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bank/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "설정 저장 실패");
      }
      setConfig(data);
      setConfigForm(data);
    } catch (e: any) {
      setError(e?.message || "설정 저장 오류");
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="admin-charge-page">
      <div className="admin-charge-bg" />
      <div className="admin-charge-overlay" />

      <main className="admin-charge-main">
        <header className="admin-charge-header">
          <div>
            <h1>충전 요청 관리</h1>
            <p className="admin-sub">실시간 요청 상태를 확인하고 승인할 수 있습니다.</p>
          </div>
          <div className="admin-header-actions">
            <button className="admin-export" onClick={handleExportCsv} type="button">
              CSV 다운로드
            </button>
            <button className="admin-refresh" onClick={fetchRequests} disabled={fetching} type="button">
              {fetching ? "불러오는 중..." : "새로고침"}
            </button>
          </div>
        </header>

        {loading && <div className="admin-empty">로딩 중...</div>}

        {!loading && (!user || !user.isAdmin) && (
          <div className="admin-empty">관리자만 접근 가능합니다.</div>
        )}

        {!loading && user?.isAdmin && (
          <section className="admin-list">
            <div className="admin-config">
              <h2>충전 정책/계좌 설정</h2>
              {configForm ? (
                <div className="admin-config-grid">
                  <div className="admin-control">
                    <label>최소 충전 금액</label>
                    <input
                      type="number"
                      value={configForm.depositMinAmount}
                      onChange={(e) => handleConfigChange("depositMinAmount", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>최대 충전 금액</label>
                    <input
                      type="number"
                      value={configForm.depositMaxAmount}
                      onChange={(e) => handleConfigChange("depositMaxAmount", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>충전 단위(원)</label>
                    <input
                      type="number"
                      value={configForm.depositUnitAmount}
                      onChange={(e) => handleConfigChange("depositUnitAmount", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>은행명</label>
                    <input
                      value={configForm.bankAccountBank}
                      onChange={(e) => handleConfigChange("bankAccountBank", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>계좌번호</label>
                    <input
                      value={configForm.bankAccountNumber}
                      onChange={(e) => handleConfigChange("bankAccountNumber", e.target.value)}
                    />
                  </div>
                  <div className="admin-control">
                    <label>예금주명</label>
                    <input
                      value={configForm.bankAccountName}
                      onChange={(e) => handleConfigChange("bankAccountName", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="admin-empty">설정 정보를 불러오는 중...</div>
              )}
              <div className="admin-config-actions">
                <button className="admin-confirm" onClick={saveConfig} disabled={configSaving} type="button">
                  {configSaving ? "저장 중..." : "설정 저장"}
                </button>
              </div>
            </div>

            <div className="admin-controls">
              <div className="admin-control">
                <label>상태</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">전체</option>
                  <option value="pending">대기</option>
                  <option value="confirmed">완료</option>
                </select>
              </div>
              <div className="admin-control grow">
                <label>검색</label>
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="요청 ID, 플레이어, 입금자, 디스코드 ID"
                />
              </div>
            </div>

            {error && <div className="admin-error">오류: {error}</div>}
            {success && <div className="admin-success">{success}</div>}
            {filteredRequests.length === 0 ? (
              <div className="admin-empty">현재 요청이 없습니다.</div>
            ) : (
              <div className="admin-table">
                <div className="admin-row admin-head">
                  <span>요청 ID</span>
                  <span>플레이어</span>
                  <span>입금자</span>
                  <span>금액</span>
                  <span>상태</span>
                  <span>액션</span>
                </div>
                {filteredRequests.map((req) => (
                  <div key={req.requestId} className="admin-row">
                    <span className="mono">{req.requestId}</span>
                    <span>{req.playerName}</span>
                    <span>{req.depositorName}</span>
                    <span>{req.amount.toLocaleString()}원</span>
                    <span className={`admin-status ${req.status}`}>{statusLabel[req.status] || req.status}</span>
                    <span className="admin-actions">
                      <button
                        className="admin-detail"
                        type="button"
                        onClick={() => setSelected(req)}
                      >
                        상세
                      </button>
                      <button
                        className="admin-confirm"
                        type="button"
                        onClick={() => confirmRequest(req.requestId)}
                        disabled={confirmingId === req.requestId || req.status !== "pending"}
                      >
                        {confirmingId === req.requestId ? "승인 중..." : "승인"}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {selected && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-backdrop" onClick={() => setSelected(null)} />
          <div className="admin-modal-card">
            <header>
              <h2>요청 상세</h2>
              <button type="button" onClick={() => setSelected(null)}>
                닫기
              </button>
            </header>
            <div className="admin-modal-body">
              <div>
                <span>요청 ID</span>
                <strong>{selected.requestId}</strong>
              </div>
              <div>
                <span>플레이어</span>
                <strong>{selected.playerName}</strong>
              </div>
              <div>
                <span>입금자</span>
                <strong>{selected.depositorName}</strong>
              </div>
              <div>
                <span>금액</span>
                <strong>{selected.amount.toLocaleString()}원</strong>
              </div>
              <div>
                <span>디스코드 ID</span>
                <strong>{selected.discordUserId}</strong>
              </div>
              <div>
                <span>마인크래프트 닉네임</span>
                <strong>{selected.minecraftName || "-"}</strong>
              </div>
              <div>
                <span>생성 시간</span>
                <strong>{new Date(selected.createdAt).toLocaleString()}</strong>
              </div>
              <div>
                <span>마감 시간</span>
                <strong>{new Date(selected.deadlineTimestamp).toLocaleString()}</strong>
              </div>
              <div>
                <span>상태</span>
                <strong>{statusLabel[selected.status] || selected.status}</strong>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="admin-confirm" type="button" onClick={() => confirmRequest(selected.requestId)}>
                승인
              </button>
              <button className="admin-detail" type="button" onClick={() => setSelected(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
