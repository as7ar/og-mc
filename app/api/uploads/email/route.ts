import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { getSession } from "@/app/lib/session";
import { getServerEnv } from "@/app/lib/env";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || mimeToExt(file.type);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", "email");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, safeName), buffer);

  const env = getServerEnv();
  const baseUrl = env.BASE_URL || "";
  const urlPath = `/uploads/email/${safeName}`;

  return NextResponse.json({
    url: baseUrl ? `${baseUrl}${urlPath}` : urlPath,
    name: file.name,
    size: file.size,
  });
}

function mimeToExt(mime: string) {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}
