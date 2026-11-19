import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import CryptoDepositForm from "../crypto-deposit-form";

export default async function CryptoDepositPage() {
  await getCurrentUser();

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-end border-b border-slate-200 pb-4">
        <Link
          href="/dashboard/crypto"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Crypto
        </Link>
      </div>

      <CryptoDepositForm />
    </div>
  );
}
