"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, TrendingUp } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/30 to-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl flex-col items-center justify-between gap-16 px-6 py-20 lg:flex-row">

        {/* LEFT SIDE */}
        <div className="max-w-2xl">

          <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            Trusted Gold Investment Platform
          </span>

          <h1 className="mt-8 text-5xl font-black leading-tight text-slate-900 lg:text-7xl">
            Invest in
            <span className="text-emerald-600"> Gold </span>
            with Confidence.
          </h1>

          <p className="mt-8 text-xl leading-8 text-slate-600">
            Buy, save and grow your wealth through secure digital gold
            investments. Fast. Transparent. Trusted.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Start Investing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button variant="outline" size="lg">
              Download App
            </Button>

          </div>

          <div className="mt-12 flex flex-wrap gap-8">

            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-600" />
              <span className="font-medium">
                Bank-level Security
              </span>
            </div>

            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-600" />
              <span className="font-medium">
                Daily Market Updates
              </span>
            </div>

          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="relative w-full max-w-md">

          {/* Floating Gold Card */}
          <div className="absolute -left-12 top-16 hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl lg:block">

            <p className="text-sm text-slate-500">
              Gold Price
            </p>

            <h3 className="mt-2 text-2xl font-bold">
              $3,426
            </h3>

            <span className="text-sm font-semibold text-emerald-600">
              ▲ +2.41%
            </span>

          </div>

          {/* Main Card */}
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-2xl">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Live Gold Price
                </p>

                <h2 className="mt-2 text-4xl font-black">
                  $3,426.58
                </h2>

              </div>

              <div className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">
                +2.41%
              </div>

            </div>

            {/* Portfolio */}
            <div className="mt-8 rounded-2xl border border-emerald-100 bg-slate-900 p-6 text-white">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-sm text-slate-400">
                    Portfolio Balance
                  </p>

                  <h3 className="mt-2 text-3xl font-bold">
                    $24,580.60
                  </h3>

                </div>

                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-400">
                  +12.6%
                </div>

              </div>

              <div className="mt-8">

                <div className="flex justify-between text-sm text-slate-400">

                  <span>Gold Holdings</span>

                  <span>18.72 oz</span>

                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700">

                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-emerald-400" />

                </div>

              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">

                <div className="rounded-xl bg-slate-800 p-4">

                  <p className="text-xs text-slate-400">
                    Today&apos;s Profit
                  </p>

                  <h4 className="mt-2 text-xl font-bold text-emerald-400">
                    +$245
                  </h4>

                </div>

                <div className="rounded-xl bg-slate-800 p-4">

                  <p className="text-xs text-slate-400">
                    Monthly ROI
                  </p>

                  <h4 className="mt-2 text-xl font-bold text-yellow-400">
                    18.7%
                  </h4>

                </div>

              </div>
                            {/* Bottom Stats */}

              <div className="mt-8 grid grid-cols-2 gap-6">

                <div>

                  <p className="text-sm text-slate-500">
                    Investors
                  </p>

                  <h3 className="text-2xl font-bold">
                    500K+
                  </h3>

                </div>

                <div>

                  <p className="text-sm text-slate-500">
                    Assets
                  </p>

                  <h3 className="text-2xl font-bold">
                    $2.8B
                  </h3>

                </div>

              </div>

            </div>

          </div>

          {/* Floating Investors Card */}

          <div className="absolute -right-10 bottom-12 hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xl lg:block">

            <p className="text-sm text-slate-500">
              Investors
            </p>

            <h3 className="mt-2 text-2xl font-bold">
              500K+
            </h3>

            <p className="text-sm text-emerald-600">
              Trusted Worldwide
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}