"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const chartData = [
  { time: "9 AM", price: 3388 },
  { time: "10 AM", price: 3396 },
  { time: "11 AM", price: 3404 },
  { time: "12 PM", price: 3418 },
  { time: "1 PM", price: 3412 },
  { time: "2 PM", price: 3423 },
  { time: "3 PM", price: 3431 },
  { time: "4 PM", price: 3426 },
];

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
};

function CustomTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 text-lg font-bold text-emerald-600">
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export default function GoldChart() {
  return (
    <div className="h-80">

      <ResponsiveContainer width="100%" height="100%">

        <AreaChart data={chartData}>

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
                stopOpacity={0.45}
              />

              <stop
                offset="100%"
                stopColor="#10b981"
                stopOpacity={0}
              />

            </linearGradient>

          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f1f5f9"
          />

          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b" }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="price"
            stroke="#10b981"
            fill="url(#goldGradient)"
            strokeWidth={4}
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke="#10b981"
            strokeWidth={4}
            dot={false}
            isAnimationActive
          />

        </AreaChart>

      </ResponsiveContainer>

    </div>
  );
}