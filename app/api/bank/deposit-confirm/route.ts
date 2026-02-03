import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";
import { fetchEmailTemplate } from "@/app/lib/email-templates";
import { renderTemplate, sendMail } from "@/app/lib/mailer";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";

  const body = await request.json();
  const payload = { requestId: body.requestId };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.BANKAPI_ADMIN_KEY) {
    headers["X-Admin-Key"] = env.BANKAPI_ADMIN_KEY;
  }

  try {
    const res = await fetch(`${baseUrl}/api/deposit-confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json();
    if (res.ok && data?.success) {
      await notifyChargeCompleted(payload.requestId);
    }
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "upstream_error" }, { status: 500 });
  }
}

async function notifyChargeCompleted(requestId: string) {
  try {
    const env = getServerEnv();
    const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";
    const headers: Record<string, string> = {};
    if (env.BANKAPI_ADMIN_KEY) {
      headers["X-Admin-Key"] = env.BANKAPI_ADMIN_KEY;
    }

    const [requestRes, configRes] = await Promise.all([
      fetch(`${baseUrl}/api/deposit-request/${requestId}`, { headers, cache: "no-store" }),
      fetch(`${baseUrl}/api/config`, { headers, cache: "no-store" }),
    ]);

    const requestData = await requestRes.json();
    const config = await configRes.json();
    if (!requestRes.ok || !requestData?.email) return;

    const template = await fetchEmailTemplate("charge_completed");
    if (!template) return;

    const account = config?.bankAccountNumber
      ? `${config.bankAccountBank} ${config.bankAccountNumber} (${config.bankAccountName})`
      : "-";

    const variables = {
      name: requestData.depositorName || requestData.playerName || "고객",
      requestId,
      amount: `${Number(requestData.amount || 0).toLocaleString()}원`,
      status: requestData.status === "confirmed" ? "충전 완료" : requestData.status,
      account,
      date: new Date().toLocaleString("ko-KR"),
    };

    const subject = renderTemplate(template.subject, variables);
    const body = renderTemplate(template.body, variables);

    await sendMail({ to: requestData.email, subject, html: body });
  } catch (error) {
    console.error("[mail] charge completed mail failed", error);
  }
}
