import {
  DollarSign,
  Wallet,
  Coins,
  TrendingUp,
} from "lucide-react";

import StatCard from "@/components/dashboard/stat-card";
import GoldPriceChart from "@/components/dashboard/gold-price-chart";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import PortfolioAllocation from "@/components/dashboard/portfolio-allocation";

export default function DashboardPage() {
  return (
    <div className="space-y-10">

      <div>

        <h2 className="text-4xl font-black text-slate-900">
          Welcome Back 👋
        </h2>

        <p className="mt-2 text-slate-500">
          Here&apos;s an overview of your investment portfolio.
        </p>

      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
          title="Portfolio Value"
          value="$58,420"
          change="+8.42%"
          icon={DollarSign}
        />

        <StatCard
          title="Wallet Balance"
          value="$12,500"
          icon={Wallet}
        />

        <StatCard
          title="Gold Holdings"
          value="18.45 oz"
          icon={Coins}
        />

        <StatCard
          title="Today&apos;s Profit"
          value="+$235"
          change="+2.13%"
          icon={TrendingUp}
        />

      </div>

      <div className="grid gap-8 xl:grid-cols-3">

  <div className="space-y-8 xl:col-span-2">

    <GoldPriceChart />

    <RecentTransactions />

  </div>

  <div className="space-y-8">

  <QuickActions />

  <PortfolioAllocation />

</div>

</div>

    </div>
  );
}