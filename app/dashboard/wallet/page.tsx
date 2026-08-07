import {
  Coins,
  DollarSign,
  Wallet,
} from "lucide-react";

import StatCard from "@/components/dashboard/stat-card";
import WalletBalance from "@/components/dashboard/wallet-balance";

export default function WalletPage() {
  return (
    <div className="space-y-10">

      <div>
        <h2 className="text-4xl font-black text-slate-900">
          Wallet
        </h2>

        <p className="mt-2 text-slate-500">
          View your balances and manage your digital assets.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        <StatCard
          title="Available Balance"
          value="$12,500"
          icon={Wallet}
        />

        <StatCard
          title="Gold Holdings"
          value="18.45 oz"
          change="+2.4%"
          icon={Coins}
        />

        <StatCard
          title="Total Value"
          value="$58,420"
          icon={DollarSign}
        />

      </div>

      <div className="grid gap-8 xl:grid-cols-3">

        <div className="xl:col-span-2">
          <WalletBalance />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

          <h3 className="text-2xl font-bold text-slate-900">
            Gold Holdings
          </h3>

          <div className="mt-8 space-y-6">

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total Gold</span>
              <span className="font-bold text-slate-900">
                18.45 oz
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Current Value</span>
              <span className="font-bold text-slate-900">
                $45,920
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Average Buy Price</span>
              <span className="font-bold text-slate-900">
                $3,180/oz
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Today&apos;s Gain</span>
              <span className="font-bold text-emerald-600">
                +$235
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}