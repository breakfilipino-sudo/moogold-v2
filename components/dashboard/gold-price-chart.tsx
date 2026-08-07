"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { time: "9 AM", price: 3388 },
  { time: "10 AM", price: 3396 },
  { time: "11 AM", price: 3404 },
  { time: "12 PM", price: 3418 },
  { time: "1 PM", price: 3412 },
  { time: "2 PM", price: 3423 },
  { time: "3 PM", price: 3431 },
  { time: "4 PM", price: 3426 },
];

export default function GoldPriceChart() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            Live Gold Price
          </p>

          <h3 className="mt-2 text-4xl font-black text-slate-900">
            $3,426.58
          </h3>

          <p className="mt-2 font-semibold text-emerald-600">
            ▲ +2.41%
          </p>

        </div>

        <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
          LIVE
        </div>

      </div>

      <div className="mt-10 h-80">

       <ResponsiveContainer width="100%" height="100%">
  <AreaChart data={data}>

    <defs>
      <linearGradient
        id="goldGradient"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop
          offset="0%"
          stopColor="#10b981"
          stopOpacity={0.35}
        />
        <stop
          offset="100%"
          stopColor="#10b981"
          stopOpacity={0}
        />
      </linearGradient>
    </defs>

    <XAxis
      dataKey="time"
      axisLine={false}
      tickLine={false}
    />

    <Tooltip
      contentStyle={{
        borderRadius: "16px",
        border: "none",
        boxShadow: "0 10px 30px rgba(0,0,0,.12)",
      }}
    />

    <Area
      type="monotone"
      dataKey="price"
      stroke="#10b981"
      strokeWidth={4}
      fill="url(#goldGradient)"
      animationDuration={1200}
    />

  </AreaChart>
</ResponsiveContainer>

      </div>

    </div>
  );
}