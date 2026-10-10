"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";

import { markWealthBoxNoticeRead } from "./notification-actions";

type ApprovalNoticeProps = {
  notificationId: string;
  title: string;
  message: string;
};

export default function ApprovalNotice({
  notificationId,
  title,
  message,
}: ApprovalNoticeProps) {
  const [visible, setVisible] = useState(true);
  const [isPending, startTransition] = useTransition();

  function dismissNotice() {
    startTransition(async () => {
      try {
        await markWealthBoxNoticeRead(notificationId);
      } finally {
        setVisible(false);
      }
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wealth-box-approval-title"
        className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#d7e3dd] bg-white shadow-2xl"
      >
        <div className="bg-[#10201b] px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300/70">
                  MooGold Wealth Box
                </p>

                <h2
                  id="wealth-box-approval-title"
                  className="mt-1 text-lg font-extrabold"
                >
                  {title}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissNotice}
              disabled={isPending}
              aria-label="Dismiss notification"
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="whitespace-pre-line text-sm font-medium leading-7 text-[#52655c]">
            {message}
          </p>

          <button
            type="button"
            onClick={dismissNotice}
            disabled={isPending}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#10201b] px-5 text-sm font-bold text-white transition hover:bg-[#18382f] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Got it"}
          </button>
        </div>
      </section>
    </div>
  );
}