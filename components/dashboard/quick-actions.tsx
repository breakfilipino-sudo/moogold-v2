import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Wallet,
} from "lucide-react";

const actions = [
  {
    title: "Deposit",
    href: "/dashboard/deposit",
    icon: ArrowDownCircle,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Withdraw",
    href: "/dashboard/withdraw",
    icon: ArrowUpCircle,
    color: "bg-red-100 text-red-600",
  },
  {
    title: "Buy Gold",
    href: "/dashboard/buy-gold",
    icon: Coins,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Wallet",
    href: "/dashboard/wallet",
    icon: Wallet,
    color: "bg-emerald-100 text-emerald-600",
  },
];

export default function QuickActions() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

      <h3 className="text-2xl font-bold text-slate-900">
        Quick Actions
      </h3>

      <div className="mt-8 grid grid-cols-2 gap-4">

        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="group rounded-2xl border border-slate-200 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${action.color}`}
              >
                <Icon className="h-7 w-7" />
              </div>

              <h4 className="mt-5 font-bold text-slate-900">
                {action.title}
              </h4>
            </Link>
          );
        })}

      </div>

    </div>
  );
}