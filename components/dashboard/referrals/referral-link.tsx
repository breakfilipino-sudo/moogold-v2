"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface ReferralLinkProps {
  referralLink: string;
}

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
      // Fallback for browsers where navigator.clipboard is unavailable.
      try {
        const textarea = document.createElement("textarea");

        textarea.value = referralLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        document.execCommand("copy");
        document.body.removeChild(textarea);

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch {
        setCopied(false);
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
        <p
          className="truncate text-sm text-white/80"
          title={referralLink}
        >
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