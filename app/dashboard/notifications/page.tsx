import {
  Bell,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import { getCurrentUser } from "@/lib/auth/current-user";

import NotificationsList from "./notifications-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { user } = await getCurrentUser();

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(user.id, 50),
    getUnreadNotificationCount(user.id),
  ]);

  const notificationData = notifications.map(
    (notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      href: notification.href,
      readAt: notification.readAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    }),
  );

  return (
    <main className="min-h-full bg-[#f7f9f8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-emerald-600"
          >
            Dashboard
            <ChevronRight className="h-4 w-4" />
            Notifications
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Bell className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Stay updated on your MooGold account and activity.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Unread notifications
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {unreadCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Account updates
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  Important activity appears here
                </p>
              </div>
            </div>
          </div>
        </div>

        <NotificationsList
          initialNotifications={notificationData}
          initialUnreadCount={unreadCount}
        />
      </div>
    </main>
  );
}