"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

import { getNotificationSummary } from "@/app/dashboard/notifications/actions";

interface DashboardContextType {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

type DashboardNotice = {
  id: string;
  title: string;
  message: string;
  href: string | null;
};

const DashboardContext =
  createContext<DashboardContextType | null>(null);

export function DashboardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<DashboardNotice | null>(null);
  const noticeQueue = useRef<DashboardNotice[]>([]);

  const router = useRouter();
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const hasInitialNotificationSnapshot = useRef(false);
  const checkingNotifications = useRef(false);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(
    () => setSidebarOpen((previous) => !previous),
    [],
  );

  const dismissNotice = useCallback(() => {
    setNotice(null);

    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
      noticeTimeout.current = null;
    }
  }, []);

  const checkForUpdates = useCallback(
    async (refreshPage: boolean) => {
      if (
        checkingNotifications.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      checkingNotifications.current = true;

      try {
        const summary = await getNotificationSummary();
        const currentIds = new Set(
          summary.notifications.map((item) => item.id),
        );

        if (!hasInitialNotificationSnapshot.current) {
          knownNotificationIds.current = currentIds;
          hasInitialNotificationSnapshot.current = true;
        } else {
          const newNotifications = summary.notifications.filter(
            (item) => !knownNotificationIds.current.has(item.id),
          );

          if (newNotifications.length > 0) {
            const notices = newNotifications.map((item) => ({
              id: item.id,
              title: item.title,
              message: item.message,
              href: item.href,
            }));

            if (notice !== null) {
              noticeQueue.current.push(...notices);
            } else {
              setNotice(notices[0]);
              noticeQueue.current.push(...notices.slice(1));
            }

            router.refresh();
          }

          knownNotificationIds.current = currentIds;
        }

        if (refreshPage) {
          router.refresh();
        }
      } catch {
        // A temporary network error must not interrupt the dashboard.
      } finally {
        checkingNotifications.current = false;
      }
    },
    [notice, router],
  );

  useEffect(() => {
    if (!notice) {
      return;
    }

    noticeTimeout.current = setTimeout(() => {
      const nextNotice = noticeQueue.current.shift() ?? null;
      setNotice(nextNotice);
      noticeTimeout.current = null;
    }, 8000);

    return () => {
      if (noticeTimeout.current) {
        clearTimeout(noticeTimeout.current);
        noticeTimeout.current = null;
      }
    };
  }, [notice]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => {
      void checkForUpdates(false);
    }, 1000);

    const interval = window.setInterval(() => {
      void checkForUpdates(true);
    }, 15000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkForUpdates(true);
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener("focus", handleVisibilityChange);

      if (noticeTimeout.current) {
        clearTimeout(noticeTimeout.current);
      }
    };
  }, [checkForUpdates]);

  return (
    <DashboardContext.Provider
      value={{
        sidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
      }}
    >
      {children}

      {notice ? (
        <div
          className="fixed right-4 top-20 z-[100] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-2"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl shadow-black/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Bell className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#10201b]">
                {notice.title}
              </p>

              <p className="mt-1 text-xs leading-5 text-black/60">
                {notice.message}
              </p>

              {notice.href ? (
                <button
                  type="button"
                  onClick={() => {
                    const href = notice.href;
                    dismissNotice();

                    if (href) {
                      router.push(href);
                    }
                  }}
                  className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  View update
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={dismissNotice}
              aria-label="Dismiss notification"
              className="rounded-lg p-1 text-black/40 transition hover:bg-black/5 hover:text-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error(
      "useDashboard must be used inside DashboardProvider",
    );
  }

  return context;
}
