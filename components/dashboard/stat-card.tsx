import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: LucideIcon;
}

export default function StatCard({
  title,
  value,
  change,
  positive = true,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-2xl">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-4 text-4xl font-black text-slate-900">
            {value}
          </h3>

          {change && (
            <p
              className={`mt-3 font-semibold ${
                positive
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {change}
            </p>
          )}

        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 transition-all duration-500 group-hover:scale-110 group-hover:bg-emerald-600">

          <Icon className="h-7 w-7 text-emerald-600 transition-all duration-500 group-hover:rotate-6 group-hover:text-white" />

        </div>

      </div>

    </div>
  );
}