import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
} from "lucide-react";

const transactions = [
  {
    id: 1,
    title: "Bought Gold",
    amount: "+0.54 oz",
    date: "Today • 10:45 AM",
    icon: Coins,
    color: "text-amber-600 bg-amber-100",
  },
  {
    id: 2,
    title: "Deposit",
    amount: "+$2,000",
    date: "Yesterday • 3:20 PM",
    icon: ArrowDownCircle,
    color: "text-blue-600 bg-blue-100",
  },
  {
    id: 3,
    title: "Sold Gold",
    amount: "-0.12 oz",
    date: "Yesterday • 11:10 AM",
    icon: Coins,
    color: "text-red-600 bg-red-100",
  },
  {
    id: 4,
    title: "Withdrawal",
    amount: "-$500",
    date: "2 days ago",
    icon: ArrowUpCircle,
    color: "text-rose-600 bg-rose-100",
  },
];

export default function RecentTransactions() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

      <h3 className="text-2xl font-bold text-slate-900">
        Recent Transactions
      </h3>

      <div className="mt-8 space-y-5">

        {transactions.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900">
                    {item.title}
                  </h4>

                  <p className="text-sm text-slate-500">
                    {item.date}
                  </p>
                </div>

              </div>

              <span className="font-bold text-slate-900">
                {item.amount}
              </span>

            </div>
          );
        })}

      </div>

    </div>
  );
}