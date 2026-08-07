"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useDashboard } from "./dashboard-provider";

export default function MobileSidebar() {
  const { sidebarOpen, closeSidebar } = useDashboard();

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      <div
        onClick={closeSidebar}
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
      />

      <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-slate-950 shadow-2xl lg:hidden">

        <div className="flex items-center justify-between border-b border-slate-800 p-6">

          <div>

            <h1 className="text-3xl font-black text-white">
              Moo<span className="text-emerald-400">Gold</span>
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Digital Gold Investment
            </p>

          </div>

          <button
            onClick={closeSidebar}
            className="rounded-xl p-2 text-white hover:bg-slate-800"
          >
            <X className="h-6 w-6" />
          </button>

        </div>

       <nav className="flex-1 space-y-2 p-5">
  {[
    ["Dashboard", "/dashboard"],
    ["Wallet", "/dashboard/wallet"],
    ["Buy Gold", "/dashboard/buy-gold"],
    ["Sell Gold", "/dashboard/sell-gold"],
    ["Portfolio", "/dashboard/portfolio"],
    ["Deposit", "/dashboard/deposit"],
    ["Withdraw", "/dashboard/withdraw"],
    ["Transactions", "/dashboard/transactions"],
    ["Settings", "/dashboard/settings"],
  ].map(([title, href]) => (
    <Link
      key={href}
      href={href}
      onClick={closeSidebar}
      className="block rounded-2xl px-5 py-4 font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
    >
      {title}
    </Link>
  ))}
</nav>

        <div className="border-t border-slate-800 p-5">
          <button
            onClick={closeSidebar}
            className="w-full rounded-2xl bg-red-500/10 px-5 py-4 font-medium text-red-400 transition hover:bg-red-500/20"
          >
            Logout
          </button>
        </div>

      </aside>
    </>
  );
}