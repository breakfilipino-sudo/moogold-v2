"use client";

import {
  Bell,
  CheckCircle2,
  Headphones,
  Menu,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/dashboard/notifications/actions";

import { useDashboard } from "./dashboard-provider";

type HeaderProps = {
  userName: string;
};

type HeaderNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const searchablePages = [
  {
    keywords: ["wallet", "balance", "cash", "money"],
    href: "/dashboard/wallet",
    label: "Wallet",
  },
  {
    keywords: ["deposit", "fund", "funds", "add money"],
    href: "/dashboard/deposit",
    label: "Deposit",
  },
  {
    keywords: ["withdraw", "withdrawal", "cash out"],
    href: "/dashboard/withdraw",
    label: "Withdraw",
  },
  {
    keywords: ["gold", "buy gold", "sell gold"],
    href: "/dashboard/gold",
    label: "Buy / Sell Gold",
  },
  {
    keywords: ["crypto", "bitcoin", "digital assets"],
    href: "/dashboard/crypto",
    label: "Crypto",
  },
  {
    keywords: ["gift", "gift card", "gift cards"],
    href: "/dashboard/gift-cards",
    label: "Gift Cards",
  },
  {
    keywords: ["referral", "referrals", "reward", "rewards"],
    href: "/dashboard/referrals",
    label: "Referrals",
  },
  {
    keywords: ["transaction", "transactions", "history", "activity"],
    href: "/dashboard/transactions",
    label: "Transactions",
  },
  {
    keywords: ["settings", "security", "profile"],
    href: "/dashboard/settings",
    label: "Settings",
  },
];

function formatNotificationDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

export default function Header({ userName }: HeaderProps) {
  const { toggleSidebar } = useDashboard();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);
  const [notifications, setNotifications] = useState<
    HeaderNotification[]
  >([]);
  const [notificationCount, setNotificationCount] =
    useState(0);
  const [notificationsLoading, setNotificationsLoading] =
    useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const notificationRef =
    useRef<HTMLDivElement>(null);

  void userName;

  const searchResults =
    search.trim().length === 0
      ? []
      : searchablePages.filter((page) => {
          const query = search.trim().toLowerCase();

          return (
            page.label.toLowerCase().includes(query) ||
            page.keywords.some((keyword) =>
              keyword.includes(query),
            )
          );
        });

  async function loadNotifications() {
    try {
      setNotificationsLoading(true);

      const result = await getNotificationSummary();

      setNotifications(result.notifications);
      setNotificationCount(result.unreadCount);
    } catch {
      // Keep the header usable if notification loading fails.
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function handleNotificationsToggle() {
    const nextOpen = !notificationsOpen;

    setNotificationsOpen(nextOpen);

    if (nextOpen) {
      await loadNotifications();
    }
  }

  useEffect(() => {
    const initialLoadTimeout = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30_000);

    return () => {
      window.clearTimeout(initialLoadTimeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target as Node,
        )
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  async function handleNotificationClick(
    notification: HeaderNotification,
  ) {
    if (!notification.readAt) {
      try {
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

        setNotificationCount((current) =>
          Math.max(0, current - 1),
        );
      } catch {
        // Navigation should still work even if marking read fails.
      }
    }

    setNotificationsOpen(false);

    if (notification.href) {
      router.push(notification.href);
    }
  }

  async function handleMarkAllAsRead() {
    if (notificationCount === 0 || markingAll) {
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

      setNotificationCount(0);
    } catch {
      // Keep the current notification state if the action fails.
    } finally {
      setMarkingAll(false);
    }
  }

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const query = search.trim().toLowerCase();

    if (!query) {
      return;
    }

    const exactMatch = searchablePages.find(
      (page) =>
        page.label.toLowerCase() === query ||
        page.keywords.includes(query),
    );

    const match =
      exactMatch ??
      searchablePages.find(
        (page) =>
          page.label.toLowerCase().includes(query) ||
          page.keywords.some((keyword) =>
            keyword.includes(query),
          ),
      );

    if (match) {
      router.push(match.href);
      setSearch("");
      setSearchOpen(false);
    }
  }

  function openSearchResult(href: string) {
    router.push(href);
    setSearch("");
    setSearchOpen(false);
  }

  return (
    <header className="relative z-30 flex h-16 items-center justify-between border-b border-black/5 bg-[#f7f9f8]/95 px-4 backdrop-blur-xl sm:px-6 lg:sticky lg:top-0 lg:px-8">
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open navigation"
          className="rounded-lg p-2 transition hover:bg-black/5 lg:hidden"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden xl:block">
          <form onSubmit={handleSearchSubmit}>
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/25" />

            <input
              value={search}
              onChange={(event) => {
                const value = event.target.value;

                setSearch(value);
                setSearchOpen(
                  value.trim().length > 0,
                );
              }}
              onFocus={() => {
                if (search.trim()) {
                  setSearchOpen(true);
                }
              }}
              placeholder="Search"
              aria-label="Search dashboard"
              autoComplete="off"
              className="h-9 w-56 rounded-lg border border-black/5 bg-white pl-9 pr-3 text-xs font-medium outline-none transition placeholder:text-black/25 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
            />
          </form>

          {searchOpen && (
            <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-black/5 bg-white p-1.5 shadow-xl shadow-black/10">
              {searchResults.length > 0 ? (
                <div className="space-y-0.5">
                  {searchResults
                    .slice(0, 6)
                    .map((result) => (
                      <button
                        key={result.href}
                        type="button"
                        onClick={() =>
                          openSearchResult(
                            result.href,
                          )
                        }
                        className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#10201b] transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Search className="mr-2.5 h-3.5 w-3.5 text-black/25" />
                        {result.label}
                      </button>
                    ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs font-bold text-[#10201b]">
                    No results found
                  </p>

                  <p className="mt-1 text-[10px] text-black/35">
                    Try wallet, gold, crypto or referrals.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Link
          href="/dashboard/support"
          aria-label="Help and Support"
          title="Help & Support"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/5 bg-white px-3.5 text-xs font-bold text-[#10201b] transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Headphones className="h-4.5 w-4.5 text-emerald-700" />

          <span className="hidden sm:inline">
            Help & Support
          </span>
        </Link>

        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            aria-label={
              notificationCount > 0
                ? `${notificationCount} notifications`
                : "Notifications"
            }
            aria-expanded={notificationsOpen}
            onClick={() =>
              void handleNotificationsToggle()
            }
            className={[
              "relative flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white transition",
              notificationsOpen
                ? "border-emerald-200 bg-emerald-50"
                : "hover:bg-slate-50",
            ].join(" ")}
          >
            <Bell className="h-4.5 w-4.5 text-black/55" />

            {notificationCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-h-4.5 min-w-4.5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-black leading-none text-white ring-2 ring-[#f7f9f8]">
                {notificationCount > 9
                  ? "10+"
                  : notificationCount}
              </span>
            ) : null}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-[22rem] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl shadow-black/10 sm:w-[22rem]">
              <div className="flex items-center justify-between border-b border-black/5 px-4 py-4">
                <div>
                  <p className="text-base font-black text-[#10201b]">
                    Notifications
                  </p>

                  <p className="mt-1 text-xs text-black/45">
                    Your latest account updates
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {notificationCount > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        void handleMarkAllAsRead()
                      }
                      disabled={markingAll}
                      className="rounded-lg px-2.5 py-2 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {markingAll
                        ? "Saving..."
                        : "Mark all read"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsOpen(false)
                    }
                    aria-label="Close notifications"
                    className="rounded-lg p-1.5 text-black/30 transition hover:bg-black/5 hover:text-black/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {notificationsLoading &&
              notifications.length === 0 ? (
                <div className="px-4 py-9 text-center">
                  <p className="text-sm font-bold text-[#10201b]">
                    Loading notifications...
                  </p>
                </div>
              ) : notifications.length > 0 ? (
                <>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() =>
                          void handleNotificationClick(
                            notification,
                          )
                        }
                        className={[
                          "flex w-full gap-3.5 border-b border-black/5 px-4 py-4 text-left transition last:border-b-0",
                          notification.readAt
                            ? "bg-white hover:bg-slate-50"
                            : "bg-emerald-50/45 hover:bg-emerald-50",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            notification.readAt
                              ? "bg-slate-100 text-slate-500"
                              : "bg-emerald-100 text-emerald-700",
                          ].join(" ")}
                        >
                          <Bell className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className={[
                                "text-sm leading-5",
                                notification.readAt
                                  ? "font-bold text-[#10201b]"
                                  : "font-black text-[#10201b]",
                              ].join(" ")}
                            >
                              {notification.title}
                            </p>

                            {!notification.readAt ? (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                            ) : null}
                          </div>

                          <p className="mt-1 text-xs leading-5 text-black/60">
                            {notification.message}
                          </p>

                          <p className="mt-1.5 text-[10px] font-medium text-black/35">
                            {formatNotificationDate(
                              notification.createdAt,
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-black/5 bg-white p-2">
                    <Link
                      href="/dashboard/notifications"
                      onClick={() =>
                        setNotificationsOpen(false)
                      }
                      className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                    >
                      View all notifications
                    </Link>
                  </div>
                </>
              ) : (
                <div className="px-4 py-8 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <p className="mt-3 text-sm font-black text-[#10201b]">
                    You&apos;re all caught up
                  </p>

                  <p className="mt-1 text-xs leading-5 text-black/45">
                    New account and wallet updates will
                    appear here.
                  </p>

                  <Link
                    href="/dashboard/notifications"
                    onClick={() =>
                      setNotificationsOpen(false)
                    }
                    className="mt-4 inline-flex rounded-xl px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}