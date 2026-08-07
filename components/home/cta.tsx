"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-28">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.18),transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-14 shadow-2xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-5 py-2 text-sm font-semibold text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span>Start Building Your Wealth Today</span>
            </div>

            <h2 className="mt-8 text-5xl font-black leading-tight text-white lg:text-6xl">
              Invest in Gold{" "}
              <span className="text-emerald-400">Without Limits</span>
            </h2>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-slate-300">
              Join thousands of investors using MooGold to grow their wealth
              with secure digital gold investments and real-time market pricing.
            </p>

            <div className="mt-12 flex flex-wrap justify-center gap-5">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700"
              >
                Start Investing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>

              <Link
                href="/market"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                View Live Market
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}