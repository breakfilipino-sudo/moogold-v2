"use client";

import {
  Smartphone,
  Download,
  ShieldCheck,
  Wallet,
} from "lucide-react";

export default function MobileApp() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-black py-28 text-white">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.25),transparent_45%)]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-20 px-6 lg:grid-cols-2">

        {/* LEFT */}

        <div>

          <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300">
            MooGold Mobile App
          </span>

          <h2 className="mt-8 text-5xl font-black leading-tight lg:text-6xl">
            Invest in Gold
            <span className="text-emerald-400">
              {" "}Anywhere.
            </span>
          </h2>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">
            Manage your wallet, buy gold, monitor live prices,
            track your portfolio and withdraw profits anytime from
            your smartphone.
          </p>

          <div className="mt-10 space-y-5">

            <div className="flex items-center gap-4">

              <ShieldCheck className="h-6 w-6 text-emerald-400" />

              <span>
                Bank-Level Security
              </span>

            </div>

            <div className="flex items-center gap-4">

              <Wallet className="h-6 w-6 text-emerald-400" />

              <span>
                Invest Directly From Wallet
              </span>

            </div>

            <div className="flex items-center gap-4">

              <Smartphone className="h-6 w-6 text-emerald-400" />

              <span>
                Available on iOS & Android
              </span>

            </div>

          </div>

          <div className="mt-12 flex flex-wrap gap-5">

            <button className="rounded-2xl bg-white px-8 py-4 font-bold text-slate-900 transition hover:scale-105">

              <div className="flex items-center gap-3">

                <Download className="h-5 w-5" />

                Download for iPhone

              </div>

            </button>

            <button className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 font-bold backdrop-blur transition hover:bg-white/20">

              <div className="flex items-center gap-3">

                <Download className="h-5 w-5" />

                Download for Android

              </div>

            </button>

          </div>

        </div>
                {/* RIGHT */}

        <div className="relative flex justify-center">

          {/* Glow */}

          <div className="absolute h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-3xl" />

          {/* Phone */}

          <div className="relative w-[340px] rounded-[42px] border border-white/10 bg-slate-900 p-5 shadow-[0_30px_80px_rgba(0,0,0,.45)]">

            {/* Dynamic Island */}

            <div className="mx-auto mb-6 h-7 w-36 rounded-full bg-black" />

            {/* Screen */}

            <div className="overflow-hidden rounded-[30px] bg-gradient-to-b from-slate-950 to-slate-900 p-6">

              <p className="text-sm text-slate-400">
                Portfolio Balance
              </p>

              <h3 className="mt-2 text-4xl font-black">
                $24,580.60
              </h3>

              <div className="mt-3 inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-400">
                ▲ +12.6%
              </div>

              {/* Gold Card */}

              <div className="mt-8 rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 p-6 text-slate-900 shadow-xl">

                <p className="text-sm font-semibold opacity-80">
                  Gold Holdings
                </p>

                <h4 className="mt-3 text-3xl font-black">
                  18.72 oz
                </h4>

                <p className="mt-2 font-medium">
                  Approx. $64,150
                </p>

              </div>

              {/* Stats */}

              <div className="mt-8 space-y-4">

                <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-4">

                  <span className="text-slate-400">
                    Wallet Balance
                  </span>

                  <span className="font-bold">
                    $8,450
                  </span>

                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-4">

                  <span className="text-slate-400">
                    Today&apos;s Profit
                  </span>

                  <span className="font-bold text-emerald-400">
                    +$245
                  </span>

                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-4">

                  <span className="text-slate-400">
                    Live Gold Price
                  </span>

                  <span className="font-bold">
                    $3,426.58
                  </span>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
        