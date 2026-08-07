import type { ReactNode } from "react";

import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import MobileSidebar from "@/components/dashboard/mobile-sidebar";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <DashboardProvider>
      <div className="flex min-h-screen bg-slate-100">

        <Sidebar />

        <MobileSidebar />

        <div className="flex min-h-screen flex-1 flex-col">

          <Header />

          <main className="flex-1 p-8">
            {children}
          </main>

        </div>

      </div>
    </DashboardProvider>
  );
}