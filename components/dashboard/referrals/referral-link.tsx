"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  Share2,
} from "lucide-react";

interface ReferralLinkProps {
  referralLink: string;
}

export default function ReferralLink({
  referralLink,
}: ReferralLinkProps) {
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  async function handleCopy() {
    if (!referralLink) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = referralLink;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();

        const succeeded = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!succeeded) throw new Error("Copy failed");
      }

      setCopied(true);
      setShareMessage("Your referral link has been copied.");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setShareMessage("We couldn't copy the link. Please select and copy it manually.");
    }
  }

  async function handleShare() {
    if (!referralLink) return;

    setShareMessage("");

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join me on MooGold",
          text: "Join me on MooGold using my referral link:",
          url: referralLink,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    }

    // Desktop browsers without Web Share API get the in-page share options.
    setShowShareOptions((current) => !current);
  }

  const shareText = `Join me on MooGold using my referral link: ${referralLink}`;
  const encodedLink = encodeURIComponent(referralLink);
  const encodedText = encodeURIComponent(shareText);

  const shareClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce8e1] bg-white px-3.5 py-2 text-xs font-bold text-[#315c4d] transition hover:border-[#b9d2c3] hover:bg-[#f1f7f3] focus:outline-none focus:ring-4 focus:ring-emerald-500/10";

  return (
    <div className="flex flex-col gap-3">
      <div className="min-w-0 rounded-2xl border border-[#dfe9e3] bg-[#f6f9f7] px-4 py-3.5">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#82928a]">
          Your referral link
        </p>
        <p className="break-all text-sm font-medium leading-6 text-[#18352b]">
          {referralLink || "Your referral link will appear here once assigned."}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!referralLink}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#10201b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#193b30] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy referral link
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={!referralLink}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#cbdcd1] bg-[#edf5f0] px-5 py-3 text-sm font-bold text-[#244b3b] transition hover:bg-[#e2efe7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {referralLink && (
        <div className="flex flex-wrap gap-2">
          <a
            className={shareClass}
            href={`https://wa.me/?text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>

          <a
            className={shareClass}
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 className="h-4 w-4" />
            Facebook
          </a>

          <a
            className={shareClass}
            href={`https://twitter.com/intent/tweet?text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on X
          </a>

          <a
            className={shareClass}
            href={`mailto:?subject=${encodeURIComponent("Join me on MooGold")}&body=${encodedText}`}
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        </div>
      )}

      {showShareOptions && (
        <div className="rounded-xl border border-[#dce8e1] bg-[#f6f9f7] px-3.5 py-3">
          <p className="text-xs font-bold text-[#244b3b]">
            Choose where to share your referral link.
          </p>
          <p className="mt-1 text-xs leading-5 text-[#82928a]">
            Select WhatsApp, Facebook, X, or Email above.
          </p>
        </div>
      )}

      {shareMessage && (
        <p className="text-xs font-medium text-[#315c4d]" role="status">
          {shareMessage}
        </p>
      )}
    </div>
  );
}
