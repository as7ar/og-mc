import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import AdminChargeClient from "./AdminChargeClient";

export default async function AdminChargePage() {
  const session = await getSession();
  if (!session.discordId || !session.isAdmin) {
    redirect("/login");
  }

  return <AdminChargeClient />;
}
