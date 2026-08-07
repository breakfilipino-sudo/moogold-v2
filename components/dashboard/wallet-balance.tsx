import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export default function WalletBalance() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 p-8 text-white shadow-xl">

      <p className="text-slate-300">
        Available Wallet Balance
      </p>

      <h2 className="mt-4 text-5xl font-black">
        $12,500.00
      </h2>

      <p className="mt-3 text-emerald-400">
        +3.8% this month
      </p>

      <div className="mt-10 flex flex-wrap gap-4">

        <Link
          href="/dashboard/deposit"
          className="inline-flex items-center rounded-2xl bg-emerald-600 px-6 py-4 font-semibold transition hover:bg-emerald-700"
        >
          <ArrowDownCircle className="mr-2 h-5 w-5" />
          Deposit
        </Link>

        <Link
          href="/dashboard/withdraw"
          className="inline-flex items-center rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-semibold backdrop-blur transition hover:bg-white/20"
        >
          <ArrowUpCircle className="mr-2 h-5 w-5" />
          Withdraw
        </Link>

      </div>

    </div>
  );
}