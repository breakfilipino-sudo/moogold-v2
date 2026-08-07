"use client";

import { useMemo, useState } from "react";
import { Calculator, Coins, DollarSign, TrendingUp } from "lucide-react";

const GOLD_PRICE = 3426.58;
const ANNUAL_RETURN = 18;

export default function InvestmentCalculator() {
  const [amount, setAmount] = useState(5000);

  const gold = useMemo(() => amount / GOLD_PRICE, [amount]);

  const profit = useMemo(
    () => (amount * ANNUAL_RETURN) / 100,
    [amount]
  );

  const total = useMemo(
    () => amount + profit,
    [amount, profit]
  );

  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-6">

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            Investment Calculator
          </span>

          <h2 className="mt-6 text-4xl font-black text-slate-900 lg:text-5xl">
            Estimate Your Gold Investment
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Move the slider to instantly see how much gold your investment
            could purchase and its estimated yearly growth.
          </p>

        </div>

        <div className="grid gap-10 lg:grid-cols-2">

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">

            <div className="flex items-center gap-3">

              <Calculator className="h-8 w-8 text-emerald-600" />

              <h3 className="text-2xl font-bold">
                Investment Amount
              </h3>

            </div>

            <div className="mt-10">

              <div className="text-5xl font-black text-slate-900">
                ${amount.toLocaleString()}
              </div>

              <input
                type="range"
                min={100}
                max={100000}
                step={100}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-10 h-3 w-full cursor-pointer accent-emerald-600"
              />

            </div>

                        <div className="mt-10 grid grid-cols-2 gap-4">

              <div className="rounded-2xl bg-slate-100 p-5">

                <p className="text-sm text-slate-500">
                  Current Gold Price
                </p>

                <h4 className="mt-2 text-2xl font-bold">
                  ${GOLD_PRICE.toLocaleString()}
                </h4>

              </div>

              <div className="rounded-2xl bg-slate-100 p-5">

                <p className="text-sm text-slate-500">
                  Estimated Annual ROI
                </p>

                <h4 className="mt-2 text-2xl font-bold text-emerald-600">
                  {ANNUAL_RETURN}%
                </h4>

              </div>

            </div>

          </div>

          {/* Results */}

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-2xl">

            <h3 className="text-2xl font-bold">
              Investment Preview
            </h3>

            <div className="mt-10 space-y-5">

              <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-5">

                <div className="flex items-center gap-3">

                  <Coins className="h-6 w-6 text-yellow-400" />

                  <span>Gold You Can Buy</span>

                </div>

                <span className="text-xl font-bold">
                  {gold.toFixed(3)} oz
                </span>

              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-5">

                <div className="flex items-center gap-3">

                  <TrendingUp className="h-6 w-6 text-emerald-400" />

                  <span>Estimated Profit</span>

                </div>

                <span className="text-xl font-bold text-emerald-400">
                  ${profit.toLocaleString()}
                </span>

              </div>

              <div className="flex items-center justify-between rounded-2xl bg-emerald-600 p-5">

                <div className="flex items-center gap-3">

                  <DollarSign className="h-6 w-6" />

                  <span>Total Value</span>

                </div>

                <span className="text-2xl font-black">
                  ${total.toLocaleString()}
                </span>

              </div>

            </div>

            <div className="mt-10 rounded-2xl bg-slate-800 p-6">

              <p className="text-sm text-slate-400">
                Example
              </p>

              <p className="mt-3 leading-7 text-slate-300">
                Investing <strong>${amount.toLocaleString()}</strong> today
                could purchase approximately{" "}
                <strong>{gold.toFixed(3)} oz</strong> of gold. Based on an
                estimated annual return of{" "}
                <strong>{ANNUAL_RETURN}%</strong>, your investment could grow
                to approximately{" "}
                <strong>${total.toLocaleString()}</strong>.
              </p>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}