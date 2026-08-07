"use client";

import {
  UserPlus,
  Wallet,
  Coins,
  LineChart,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description:
      "Sign up in minutes and verify your account securely to begin investing.",
  },
  {
    number: "02",
    icon: Wallet,
    title: "Fund Your Wallet",
    description:
      "Deposit funds into your MooGold wallet using your preferred payment method.",
  },
  {
    number: "03",
    icon: Coins,
    title: "Buy Gold",
    description:
      "Invest any amount directly from your wallet balance with no fixed investment plans.",
  },
  {
    number: "04",
    icon: LineChart,
    title: "Track & Grow",
    description:
      "Monitor your portfolio with live gold prices and watch your investment grow over time.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-20 max-w-3xl text-center">

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            How It Works
          </span>

          <h2 className="mt-6 text-4xl font-black text-slate-900 lg:text-5xl">
            Start Investing in Four Simple Steps
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Getting started with MooGold is quick, secure and designed for everyone.
          </p>

        </div>

        <div className="relative grid gap-10 lg:grid-cols-4">

          <div className="absolute left-0 right-0 top-20 hidden h-1 rounded-full bg-emerald-100 lg:block" />
                    {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="group relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-2xl"
              >
                <div className="absolute -top-5 left-8 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-lg">
                  {step.number}
                </div>

                <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 transition-colors duration-300 group-hover:bg-emerald-600">
                  <Icon className="h-8 w-8 text-emerald-600 transition-colors duration-300 group-hover:text-white" />
                </div>

                <h3 className="mt-8 text-2xl font-bold text-slate-900">
                  {step.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-600">
                  {step.description}
                </p>

                <div className="mt-8 flex items-center gap-2 font-semibold text-emerald-600">
                  <span>Step {step.number}</span>

                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            );
          })}

        </div>

        <div className="mt-20 rounded-[32px] bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-12 text-center text-white shadow-2xl lg:px-16">

          <h3 className="text-3xl font-black lg:text-4xl">
            Investing Has Never Been This Simple
          </h3>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-emerald-50">
            Deposit funds, buy gold instantly, monitor your portfolio in real
            time, and grow your wealth—all from one secure platform.
          </p>

        </div>

      </div>

    </section>
  );
}