"use client";

import {
  ShieldCheck,
  Wallet,
  TrendingUp,
  Globe,
  Zap,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Bank-Level Security",
    description:
      "Your investments are protected with enterprise-grade security and encrypted infrastructure.",
  },
  {
    icon: Wallet,
    title: "Wallet-Based Investing",
    description:
      "Deposit funds once and invest directly from your wallet without fixed investment plans.",
  },
  {
    icon: TrendingUp,
    title: "Live Gold Prices",
    description:
      "Track market movements with real-time pricing before buying or selling gold.",
  },
  {
    icon: Globe,
    title: "Global Access",
    description:
      "Access your portfolio securely from anywhere using any device.",
  },
  {
    icon: Zap,
    title: "Instant Transactions",
    description:
      "Fast deposits, investments and withdrawals with a seamless experience.",
  },
  {
    icon: Lock,
    title: "Secure Platform",
    description:
      "Advanced protection keeps your account and investment history safe.",
  },
];

export default function WhyChoose() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            Why Choose MooGold
          </span>

          <h2 className="mt-6 text-4xl font-black text-slate-900 lg:text-5xl">
            Built for Modern Gold Investors
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Everything you need to invest confidently, manage your portfolio,
            and grow your wealth through digital gold.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                      {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-2xl"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 transition-colors duration-300 group-hover:bg-emerald-600">

                  <Icon className="h-8 w-8 text-emerald-600 transition-colors duration-300 group-hover:text-white" />

                </div>

                <h3 className="mt-8 text-2xl font-bold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {feature.description}
                </p>

                <div className="mt-8 flex items-center gap-2 font-semibold text-emerald-600">

                  <span>
                    Learn More
                  </span>

                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>

                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 rounded-[32px] bg-slate-900 px-8 py-12 text-center text-white lg:px-16">

          <h3 className="text-3xl font-black lg:text-4xl">
            Invest in Gold with Confidence
          </h3>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            MooGold combines security, transparency and live market pricing,
            making digital gold investing simple for everyone.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-10">

            <div>
              <p className="text-4xl font-black text-emerald-400">
                500K+
              </p>

              <p className="mt-2 text-slate-400">
                Investors
              </p>
            </div>

            <div>
              <p className="text-4xl font-black text-emerald-400">
                $2.8B
              </p>

              <p className="mt-2 text-slate-400">
                Assets Managed
              </p>
            </div>

            <div>
              <p className="text-4xl font-black text-emerald-400">
                99.9%
              </p>

              <p className="mt-2 text-slate-400">
                Platform Uptime
              </p>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}