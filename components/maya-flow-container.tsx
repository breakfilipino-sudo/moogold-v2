"use client";

import React, { useState, useRef } from "react";

export function MayaFlowContainer() {
  const [step, setStep] = useState<"login" | "otp">("login");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber && password) {
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

  return (
    <div className="mx-auto w-full max-w-sm flex flex-col justify-between min-h-[520px] bg-white">
      {step === "login" ? (
        <form onSubmit={handleLoginSubmit} className="flex flex-col flex-grow justify-between">
          <div className="flex flex-col items-center">
            {/* Logo */}
            <div className="my-8">
              <h1 className="text-5xl font-extrabold tracking-tighter text-[#1db954] lowercase">
                maya
              </h1>
            </div>

            {/* Inputs */}
            <div className="w-full space-y-4">
              <input
                type="text"
                placeholder="Mobile number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                className="w-full px-5 py-4 bg-[#f8fafc] text-slate-800 placeholder-slate-400 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-[#1db954]/30 text-sm font-medium"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-[#f8fafc] text-slate-800 placeholder-slate-400 rounded-2xl border-none focus:outline-none focus:ring-2 focus:ring-[#1db954]/30 text-sm font-medium pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M3 13c1.5 3 4.5 5 9 5s7.5-2 9-5M6 10l-1-2m13 2l1-2M10 11l-1 1m5-1l1 1"
                    />
                  </svg>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  className="text-[#1db954] font-semibold text-sm hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8">
            <button
              type="submit"
              className="w-full py-4 bg-[#a7f3d0] hover:bg-[#86efac] text-emerald-950 font-semibold rounded-2xl transition-all duration-200 text-sm"
            >
              Log in
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col flex-grow justify-between">
          <div>
            {/* Header */}
            <div className="mb-6 mt-4 text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                One-time <span className="text-[#1db954]">PIN</span>
              </h2>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Please enter the one-time PIN (OTP) that we sent to +63{" "}
                {mobileNumber ? mobileNumber.slice(-4) : "••••••"}
              </p>
            </div>

            {/* OTP Input Fields */}
            <div className="flex justify-between gap-2 my-8">
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
                  className="w-11 h-14 text-center text-xl font-medium bg-[#f8fafc] border border-slate-200 rounded-2xl focus:outline-none focus:border-[#1db954] focus:ring-1 focus:ring-[#1db954]"
                />
              ))}
            </div>
          </div>

          {/* Verify Actions */}
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => alert("Deposit authentication complete")}
              className="w-full py-4 bg-[#a7f3d0] hover:bg-[#86efac] text-emerald-950 font-semibold rounded-2xl transition-all duration-200 text-sm"
            >
              Verify
            </button>

            <div className="text-center space-y-1 pb-2">
              <p className="text-slate-400 text-xs">Didn't receive code?</p>
              <button
                type="button"
                className="text-[#1db954] font-semibold text-xs hover:underline"
              >
                Resend code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}