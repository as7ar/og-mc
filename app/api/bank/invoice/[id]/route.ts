import { NextRequest } from "next/server";
import path from "path";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.discordId) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const env = getServerEnv();
  const baseUrl = env.BANKAPI_BASE_URL || "http://localhost:3001";
  const headers: Record<string, string> = {};
  if (env.BANKAPI_ADMIN_KEY) {
    headers["X-Admin-Key"] = env.BANKAPI_ADMIN_KEY;
  }

  const requestRes = await fetch(`${baseUrl}/api/deposit-request/${id}`, {
    headers,
    cache: "no-store",
  });
  const requestData = await requestRes.json();
  if (!requestRes.ok) {
    return new Response(JSON.stringify({ error: requestData?.error || "not_found" }), {
      status: requestRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!session.isAdmin && requestData.discordUserId !== session.discordId) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (requestData.status !== "confirmed") {
    return new Response(JSON.stringify({ error: "not_confirmed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const configRes = await fetch(`${baseUrl}/api/config`, { headers, cache: "no-store" });
  const config = await configRes.json();

  const pdfBuffer = await buildInvoicePdf({ requestData, config });
  const filename = `invoice-${id}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}

type InvoiceRequest = {
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

type InvoiceConfig = {
  bankAccountBank?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
};

async function buildInvoicePdf({
  requestData,
  config,
}: {
  requestData: InvoiceRequest;
  config: InvoiceConfig;
}): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  const chunks: Buffer[] = [];

  const fontPath = path.join(process.cwd(), "app", "assets", "fonts", "MalgunGothic.ttf");
  doc.registerFont("Korean", fontPath);
  doc.font("Korean");

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const account = config?.bankAccountNumber
    ? `${config.bankAccountBank} ${config.bankAccountNumber} (${config.bankAccountName})`
    : "-";

  doc.fontSize(20).text("OG 충전 명세서", { align: "center" });
  doc.moveDown(1.2);

  doc.fontSize(12).text(`요청 ID: ${requestData.requestId}`);
  doc.text(`플레이어: ${requestData.playerName}`);
  doc.text(`입금자: ${requestData.depositorName}`);
  doc.text(`마인크래프트 닉네임: ${requestData.minecraftName || "-"}`);
  doc.text(`금액: ${Number(requestData.amount).toLocaleString()}원`);
  doc.text(`상태: ${requestData.status === "confirmed" ? "충전 완료" : requestData.status}`);
  doc.text(`요청일: ${new Date(requestData.createdAt).toLocaleString("ko-KR")}`);
  doc.text(`마감일: ${new Date(requestData.deadlineTimestamp).toLocaleString("ko-KR")}`);
  doc.text(`입금 계좌: ${account}`);

  doc.moveDown(1.2);
  doc.fontSize(10).fillColor("#666666").text("본 명세서는 OG 충전 확인용으로 발급되었습니다.");
  doc.fillColor("#000000");

  doc.end();

  return await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}


