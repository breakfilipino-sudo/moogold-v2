"use client";

import { ShieldCheck, Users, Globe2, Wallet } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "500K+",
    label: "Active Investors",
  },
  {
    icon: Wallet,
    value: "$2.8B",
    label: "Assets Managed",
  },
  {
    icon: Globe2,
    value: "180+",
    label: "Countries",
  },
  {
    icon: ShieldCheck,
    value: "99.99%",
    label: "Platform Uptime",
  },
];

export default function Stats() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">

          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Icon className="h-7 w-7" />
                </div>

                <h3 className="mt-8 text-4xl font-black text-slate-900">
                  {item.value}
                </h3>

                <p className="mt-3 text-slate-500">
                  {item.label}
                </p>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}
