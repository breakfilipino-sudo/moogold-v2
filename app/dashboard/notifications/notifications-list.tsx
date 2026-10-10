"use client";

import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsListProps = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

function getTypeLabel(type: string) {
  switch (type) {
    case "DEPOSIT":
      return "Deposit";

    case "WITHDRAWAL":
      return "Withdrawal";

    case "CRYPTO_DEPOSIT":
      return "Crypto deposit";

    case "CRYPTO_WITHDRAWAL":
      return "Crypto withdrawal";

    case "REFERRAL":
      return "Referral";

    case "GIFT_CARD":
      return "Gift card";

    case "GOLD":
      return "Gold";

    case "SECURITY":
      return "Security";

    case "ACCOUNT":
      return "Account";

    case "SUPPORT":
      return "Support";

    default:
      return "MooGold";
  }
}

function getTypeClasses(type: string) {
  switch (type) {
    case "SECURITY":
      return "bg-amber-50 text-amber-700";

    case "WITHDRAWAL":
    case "CRYPTO_WITHDRAWAL":
      return "bg-blue-50 text-blue-700";

    case "DEPOSIT":
    case "CRYPTO_DEPOSIT":
      return "bg-emerald-50 text-emerald-700";

    case "REFERRAL":
      return "bg-violet-50 text-violet-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function NotificationsList({
  initialNotifications,
  initialUnreadCount,
}: NotificationsListProps) {
  const router = useRouter();

  const [notifications, setNotifications] = useState(
    initialNotifications,
  );

  const [unreadCount, setUnreadCount] = useState(
    initialUnreadCount,
  );

  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(
    null,
  );

  async function handleNotificationClick(
    notification: NotificationItem,
  ) {
    if (!notification.readAt) {
      try {
        setMarkingId(notification.id);

        await markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  readAt: new Date().toISOString(),
                }
              : item,
          ),
        );

        setUnreadCount((current) =>
          Math.max(0, current - 1),
        );
      } catch {
        // Keep the notification unread if the server action fails.
      } finally {
        setMarkingId(null);
      }
    }

    if (notification.href) {
      router.push(notification.href);
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    try {
      setMarkingAll(true);

      await markAllNotificationsRead();

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? now,
        })),
      );

      setUnreadCount(0);
    } catch {
      // Keep the current state if the server action fails.
    } finally {
      setMarkingAll(false);
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="px-5 py-16 text-center sm:py-20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-sm font-black text-[#10201b]">
          You&apos;re all caught up
        </h3>

        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-black/35">
          New account, wallet and security updates will
          appear here when there is something important to
          share.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 sm:px-5">
        <p className="text-[10px] font-bold text-black/35">
          {notifications.length} recent notification
          {notifications.length === 1 ? "" : "s"}
        </p>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void handleMarkAllAsRead()}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            <Check className="h-3 w-3" />

            {markingAll
              ? "Saving..."
              : "Mark all as read"}
          </button>
        ) : null}
      </div>

      <div>
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() =>
              void handleNotificationClick(notification)
            }
            disabled={markingId === notification.id}
            className={[
              "group flex w-full gap-3 border-b border-black/5 px-4 py-4 text-left transition last:border-b-0 sm:px-5",
              notification.readAt
                ? "bg-white hover:bg-slate-50"
                : "bg-emerald-50/35 hover:bg-emerald-50/70",
              markingId === notification.id
                ? "opacity-60"
                : "",
            ].join(" ")}
          >
            <div
              className={[
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                notification.readAt
                  ? "bg-slate-100 text-slate-500"
                  : "bg-emerald-100 text-emerald-700",
              ].join(" ")}
            >
              <Bell className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={[
                    "text-xs text-[#10201b]",
                    notification.readAt
                      ? "font-bold"
                      : "font-black",
                  ].join(" ")}
                >
                  {notification.title}
                </h3>

                <span
                  className={[
                    "rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide",
                    getTypeClasses(notification.type),
                  ].join(" ")}
                >
                  {getTypeLabel(notification.type)}
                </span>

                {!notification.readAt ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                ) : null}
              </div>

              <p className="mt-1 text-[11px] leading-5 text-black/45">
                {notification.message}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-[9px] font-medium text-black/25">
                  {formatDate(notification.createdAt)}
                </span>

                {notification.href ? (
                  <>
                    <span className="text-black/15">
                      •
                    </span>

                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-700 opacity-80 transition group-hover:opacity-100">
                      View
                      <ChevronRight className="h-2.5 w-2.5" />
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}