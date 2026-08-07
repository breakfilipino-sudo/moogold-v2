"use client";

import GoldChart from "@/components/charts/gold-chart";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";

const periods = ["1D", "1W", "1M", "1Y", "ALL"];

export default function LiveMarket() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            Live Gold Market
          </span>

          <h2 className="mt-6 text-4xl font-black text-slate-900 lg:text-5xl">
            Track Gold Prices in Real Time
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Stay informed with live market prices before making your next investment.
          </p>

        </div>

        <div className="grid gap-10 lg:grid-cols-3">

          {/* Chart Card */}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl lg:col-span-2">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>

                <p className="text-sm text-slate-500">
                  Gold Price
                </p>

                <h3 className="mt-2 text-5xl font-black">
                  $3,426.58
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Updated every few seconds
                </p>

              </div>

              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                ▲ +2.41%
              </div>

            </div>

            {/* Gold Chart */}

            <div className="mt-10">
              <GoldChart />
            </div>

            {/* Time Filters */}

            <div className="mt-8 flex flex-wrap gap-3">

              {periods.map((period) => (

                <button
                  key={period}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
                    period === "1D"
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {period}
                </button>

              ))}

            </div>

          </div>

                    {/* Right Card */}

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">

            <div className="flex items-center gap-3">

              <TrendingUp className="h-6 w-6 text-emerald-400" />

              <h3 className="text-2xl font-bold">
                Market Summary
              </h3>

            </div>

            <div className="mt-10 space-y-6">

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-slate-400">
                  Current Price
                </span>

                <span className="font-bold text-emerald-400">
                  $3,426.58
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-slate-400">
                  24H High
                </span>

                <span className="font-bold">
                  $3,451.20
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-slate-400">
                  24H Low
                </span>

                <span className="font-bold">
                  $3,388.10
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-slate-400">
                  Market Cap
                </span>

                <span className="font-bold">
                  $18.5B
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-slate-400">
                  Volume
                </span>

                <span className="font-bold">
                  892K oz
                </span>
              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-400">
                  Updated
                </span>

                <span className="font-bold text-emerald-400">
                  Live
                </span>

              </div>

            </div>

            <Button className="mt-10 w-full bg-emerald-600 hover:bg-emerald-700">
              View Live Market
              <ArrowUpRight className="ml-2 h-5 w-5" />
            </Button>

          </div>

        </div>

        {/* Bottom Cards */}

        <div className="mt-16 grid gap-6 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">

            <BarChart3 className="h-8 w-8 text-emerald-600" />

            <h4 className="mt-5 text-xl font-bold">
              Daily Analysis
            </h4>

            <p className="mt-3 text-slate-600">
              Monitor professional gold market movements with interactive charts and trend analysis.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">

            <TrendingUp className="h-8 w-8 text-emerald-600" />

            <h4 className="mt-5 text-xl font-bold">
              Wallet Investing
            </h4>

            <p className="mt-3 text-slate-600">
              Deposit funds once and invest any amount directly from your wallet balance.
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">

            <ArrowUpRight className="h-8 w-8 text-emerald-600" />

            <h4 className="mt-5 text-xl font-bold">
              Secure Growth
            </h4>

            <p className="mt-3 text-slate-600">
              Build long-term wealth through transparent digital gold investments backed by real market prices.
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}