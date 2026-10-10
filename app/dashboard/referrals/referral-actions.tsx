"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

type ReferralActionsProps = {
  referralLink: string;
};

export default function ReferralActions({
  referralLink,
}: ReferralActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2200);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (!referralLink) return;

    if (
      typeof navigator !== "undefined" &&
      "share" in navigator
    ) {
      try {
        await navigator.share({
          title: "Join MooGold",
          text: "Join me on MooGold.",
          url: referralLink,
        });
        return;
      } catch {
        // User cancelled the share dialog.
      }
    }

    await copyLink();
  }

  if (!referralLink) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-12 flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white/40">
          Referral link is not available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
        <p className="truncate text-sm text-white/80">
          {referralLink}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#10201b] transition hover:bg-white/90 active:scale-[0.98] sm:flex-none"
          aria-label="Copy referral link"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy link
            </>
          )}
        </button>

        <button
          type="button"
          onClick={shareLink}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10 active:scale-[0.98]"
          aria-label="Share referral link"
          title="Share referral link"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}