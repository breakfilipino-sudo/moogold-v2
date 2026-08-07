"use client";

import { useState } from "react";
import {
  Bell,
  Menu,
  Search,
  UserCircle2,
} from "lucide-react";

import { useDashboard } from "./dashboard-provider";
import { dashboardData } from "@/lib/data/dashboard";

export default function Header() {
  const [showNotifications] = useState(false);
  const [showProfile] = useState(false);

  const { toggleSidebar } = useDashboard();

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-7 w-7" />
        </button>

        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-slate-500">
            Welcome back to MooGold
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden md:block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Search..."
            className="w-72 rounded-full border border-slate-200 bg-slate-50 py-3 pl-12 pr-5 outline-none transition focus:border-emerald-500"
          />
        </div>

        <button className="relative rounded-full bg-slate-100 p-3 transition hover:bg-slate-200">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3">
          <UserCircle2 className="h-11 w-11 text-emerald-600" />

          <div className="hidden sm:block">
            <p className="font-semibold text-slate-900">
              {dashboardData.user.name}
            </p>

            <p className="text-sm text-slate-500">
              {dashboardData.user.plan}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}