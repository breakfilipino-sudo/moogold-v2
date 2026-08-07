import {
  Coins,
  DollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";

import GoldPriceChart from "@/components/dashboard/gold-price-chart";
import PortfolioAllocation from "@/components/dashboard/portfolio-allocation";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import StatCard from "@/components/dashboard/stat-card";
import { dashboardData } from "@/lib/data/dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-8">

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Portfolio Value"
          value={dashboardData.portfolioValue}
          change={dashboardData.goldChange}
          icon={DollarSign}
        />

        <StatCard
          title="Wallet Balance"
          value={dashboardData.walletBalance}
          icon={Wallet}
        />

        <StatCard
          title="Gold Holdings"
          value={dashboardData.goldHoldings}
          icon={Coins}
        />

        <StatCard
          title="Today&apos;s Profit"
          value={dashboardData.todayProfit}
          change={dashboardData.goldChange}
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