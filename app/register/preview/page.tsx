"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, MessageSquareLock, ShieldCheck, X } from "lucide-react";

type Screen = "verify" | "pin" | "success";

export default function RegistrationPreviewPage() {
  const [screen, setScreen] = useState<Screen>("verify");
  const [showPin, setShowPin] = useState(false);

  const tabs: { id: Screen; label: string }[] = [
    { id: "verify", label: "Verify email" },
    { id: "pin", label: "Create PIN" },
    { id: "success", label: "PIN created" },
  ];

  return (
    <main className="min-h-screen bg-[#f3f5f3] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-xl">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-[#78847d]">
          Registration pop-up preview
        </p>

        <nav className="mb-6 flex gap-2 rounded-2xl border border-[#e2e7e3] bg-white p-2 shadow-sm" aria-label="Preview pop-up">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => { setScreen(tab.id); setShowPin(false); }}
              className={`min-h-11 flex-1 rounded-xl px-2 py-2.5 text-xs font-bold sm:text-sm ${screen === tab.id ? "bg-[#147b52] text-white" : "text-[#536159] hover:bg-[#f1f5f2]"}`}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex min-h-[540px] items-center justify-center rounded-[28px] border border-[#e4e9e5] bg-[#e9eeea] p-3 sm:p-8">
          <section role="dialog" aria-modal="true"
            aria-label={screen === "verify" ? "Email verification" : screen === "pin" ? "PIN setup" : "PIN creation success"}
            className="relative w-full max-w-md rounded-[26px] border border-[#e7ebe8] bg-white p-5 shadow-[0_24px_80px_rgba(25,45,34,0.14)] sm:p-8">
            <button type="button" aria-label="Return to verification preview" onClick={() => setScreen("verify")}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-[#77837b] hover:bg-[#f1f4f1]">
              <X className="h-4 w-4" />
            </button>

            {screen === "verify" && (
              <div className="pt-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf5ee]">
                  <MessageSquareLock className="h-6 w-6 text-[#147b52]" />
                </div>
                <p className="mt-6 text-center text-xs font-bold uppercase tracking-widest text-[#77847b]">Verification code</p>
                <div className="mt-5 flex justify-center gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex h-12 min-w-0 max-w-12 flex-1 items-center justify-center rounded-xl border border-[#dce4de] bg-[#fbfcfb] text-lg font-bold text-[#147b52] sm:h-14">•</div>
                  ))}
                </div>
                <p className="mt-5 text-center text-sm leading-6 text-[#6d7971]">Enter the six-digit code sent to your email address.</p>
                <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#f3f7f4] p-3.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#147b52]" />
                  <p className="text-xs leading-5 text-[#627067]">Keep your verification code private. MooGold support will never ask you to share it.</p>
                </div>
              </div>
            )}

            {screen === "pin" && (
              <div className="pt-3">
                <div className="flex items-center gap-3 rounded-xl border border-[#e0e9e2] bg-[#f7faf7] px-3.5 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3eb]"><ShieldCheck className="h-5 w-5 text-[#147b52]" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#78847b]">Verified email</p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#27372d]">preview@moogold.test</p>
                  </div>
                </div>
                {["New PIN", "Confirm PIN"].map((label) => (
                  <div key={label} className="mt-6">
                    <p className="mb-3 text-center text-xs font-bold text-[#526157]">{label}</p>
                    <div className="flex justify-center gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex h-14 w-12 items-center justify-center rounded-xl border border-[#dce4de] bg-[#fbfcfb] text-xl font-bold text-[#24352b] sm:w-14">{showPin ? "1" : "•"}</div>
                      ))}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setShowPin((v) => !v)} className="mx-auto mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#637168] hover:bg-[#f4f7f4]">
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPin ? "Hide PIN" : "Show PIN"}
                </button>
                <div className="mt-4 rounded-xl border border-[#e6ebe7] bg-[#f6f8f6] px-4 py-3.5">
                  <p className="text-xs leading-5 text-[#56645a]"><span className="font-bold text-[#28382d]">Choose a PIN that is hard to guess.</span>{" "}Avoid simple sequences like 1234 or repeated digits like 0000.</p>
                </div>
                <button type="button" disabled className="mt-6 h-12 w-full rounded-xl bg-[#147b52] text-sm font-bold text-white opacity-60">Continue (preview only)</button>
              </div>
            )}

            {screen === "success" && (
              <div className="px-1 pb-2 pt-5 text-center">
                <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#eaf5ee]"><CheckCircle2 className="h-9 w-9 text-[#147b52]" /></div>
                <h2 className="mt-6 text-xl font-bold tracking-tight text-[#24352b]">PIN created successfully</h2>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#6b786f]">Your PIN is ready. Your account setup can now continue.</p>
                <div className="mx-auto mt-7 flex items-center justify-center gap-2">
                  <span className="h-1.5 w-6 rounded-full bg-[#147b52]" />
                  <span className="h-1.5 w-6 rounded-full bg-[#147b52]" />
                  <span className="h-1.5 w-6 rounded-full bg-[#147b52]" />
                </div>
              </div>
            )}
          </section>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-[#78847d]">Visual preview only. No OTP is sent, no PIN is saved, and no account or registration status is changed.</p>
      </div>
    </main>
  );
}
