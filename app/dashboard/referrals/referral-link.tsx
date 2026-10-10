"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type ReferralLinkProps = {
  referralLink: string;
};

export default function ReferralLink({
  referralLink,
}: ReferralLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Fallback for browsers where Clipboard API is unavailable.
      const textarea = document.createElement("textarea");

      textarea.value = referralLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand("copy");
        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
        <p className="truncate text-sm text-white/80">
          {referralLink || "Referral link will appear here"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        disabled={!referralLink}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-[#10201b] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
}