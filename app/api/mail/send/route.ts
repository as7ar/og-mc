import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { fetchEmailTemplate } from "@/app/lib/email-templates";
import { renderTemplate, sendMail } from "@/app/lib/mailer";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { to, templateKey, variables, subject, html } = body || {};

  if (!to) {
    return NextResponse.json({ error: "to가 필요합니다." }, { status: 400 });
  }

  let finalSubject = subject || "";
  let finalHtml = html || "";

  if (templateKey) {
    const template = await fetchEmailTemplate(templateKey);
    if (!template) {
      return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
    }
    finalSubject = renderTemplate(template.subject, variables || {});
    finalHtml = renderTemplate(template.body, variables || {});
  }

  if (!finalSubject || !finalHtml) {
    return NextResponse.json({ error: "subject/html 또는 templateKey가 필요합니다." }, { status: 400 });
  }

  try {
    await sendMail({ to, subject: finalSubject, html: finalHtml });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "메일 전송 실패" }, { status: 500 });
  }
}
