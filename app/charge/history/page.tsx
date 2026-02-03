import { Suspense } from "react";
import ChargeHistoryClient from "./ChargeHistoryClient";

export default function ChargeHistoryPage() {
  return (
    <Suspense fallback={null}>
      <ChargeHistoryClient />
    </Suspense>
  );
}
