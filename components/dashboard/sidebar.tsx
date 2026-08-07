"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Wallet,
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  BriefcaseBusiness,
  ReceiptText,
  Settings,
  LogOut,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Wallet",
    href: "/dashboard/wallet",
    icon: Wallet,
  },
  {
    title: "Buy Gold",
    href: "/dashboard/buy-gold",
    icon: Coins,
  },
  {
    title: "Sell Gold",
    href: "/dashboard/sell-gold",
    icon: ArrowUpCircle,
  },
  {
    title: "Portfolio",
    href: "/dashboard/portfolio",
    icon: BriefcaseBusiness,
  },
  {
    title: "Deposit",
    href: "/dashboard/deposit",
    icon: ArrowDownCircle,
  },
  {
    title: "Withdraw",
    href: "/dashboard/withdraw",
    icon: ArrowUpCircle,
  },
  {
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: ReceiptText,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-72 flex-col border-r border-slate-800 bg-slate-950 lg:flex">

      <div className="border-b border-slate-800 p-8">

        <h1 className="text-3xl font-black text-white">
          Moo
          <span className="text-emerald-400">Gold</span>
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Digital Gold Investment
        </p>

      </div>

      <nav className="flex-1 space-y-2 p-5">
                {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-4 rounded-2xl px-5 py-4 font-medium transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-5">
        <button className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400">
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>

    </aside>
  );
}