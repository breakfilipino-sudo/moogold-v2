const assets = [
  {
    name: "Gold Holdings",
    value: "$45,920",
    percent: 78,
    color: "bg-amber-500",
  },
  {
    name: "Wallet Balance",
    value: "$9,800",
    percent: 17,
    color: "bg-emerald-500",
  },
  {
    name: "Pending Returns",
    value: "$2,700",
    percent: 5,
    color: "bg-blue-500",
  },
];

export default function PortfolioAllocation() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

      <h3 className="text-2xl font-bold text-slate-900">
        Portfolio Allocation
      </h3>

      <p className="mt-2 text-slate-500">
        Distribution of your current assets.
      </p>

      <div className="mt-8 space-y-6">

        {assets.map((asset) => (
          <div key={asset.name}>

            <div className="mb-2 flex items-center justify-between">

              <div>

                <h4 className="font-semibold text-slate-900">
                  {asset.name}
                </h4>

                <p className="text-sm text-slate-500">
                  {asset.value}
                </p>

              </div>

              <span className="font-bold text-slate-700">
                {asset.percent}%
              </span>

            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className={`h-full rounded-full ${asset.color}`}
                style={{ width: `${asset.percent}%` }}
              />

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}