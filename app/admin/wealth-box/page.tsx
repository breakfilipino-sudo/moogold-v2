import Link from "next/link";
import {
ArrowLeft,
ArrowRight,
Bitcoin,
CreditCard,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
const supabase = await createClient();

const {
data: { user: authUser },
} = await supabase.auth.getUser();

if (!authUser) {
return null;
}

const user = await prisma.user.findUnique({
where: {
authUserId: authUser.id,
},
select: {
role: true,
},
});

return user?.role === "ADMIN" ? user : null;
}

function formatCurrency(
amount: number,
currency: string,
) {
return new Intl.NumberFormat("en-US", {
style: "currency",
currency,
minimumFractionDigits: 2,
maximumFractionDigits: 2,
}).format(amount);
}

function formatDate(date: Date) {
return new Intl.DateTimeFormat("en-US", {
month: "short",
day: "numeric",
year: "numeric",
hour: "numeric",
minute: "2-digit",
}).format(date);
}

function getStatusClasses(status: string) {
switch (status) {
case "COMPLETED":
return "bg-emerald-100 text-emerald-700";

case "PROCESSING":
  return "bg-blue-100 text-blue-700";

case "REJECTED":
  return "bg-red-100 text-red-700";

case "CANCELLED":
  return "bg-slate-100 text-slate-600";

default:
  return "bg-amber-100 text-amber-700";

}
}

export default async function AdminWealthBoxPage() {
const admin = await requireAdmin();

if (!admin) {
return null;
}

const fundings =
await prisma.wealthFunding.findMany({
orderBy: {
createdAt: "desc",
},
include: {
user: {
select: {
fullName: true,
email: true,
phone: true,
},
},
plan: {
select: {
name: true,
durationDays: true,
returnPercentage: true,
},
},
cryptoDeposit: {
select: {
asset: true,
network: true,
amount: true,
receivingAddress: true,
transactionHash: true,
},
},
},
});

const pendingCount = fundings.filter(
(funding) => funding.status === "PENDING",
).length;

const completedCount = fundings.filter(
(funding) => funding.status === "COMPLETED",
).length;

const rejectedCount = fundings.filter(
(funding) => funding.status === "REJECTED",
).length;

return ( <div className="min-h-screen bg-slate-50"> <div className="mx-auto max-w-7xl px-6 py-10"> <Link
       href="/admin"
       className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
     > <ArrowLeft className="h-4 w-4" />
Back to Admin </Link>

```
    <div className="mt-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
          Wealth Box Management
        </p>

        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
          Wealth Box
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Review customer Wealth Box funding,
          verify payments, and approve or reject
          investment requests.
        </p>
      </div>
    </div>

    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-bold text-amber-700">
          Pending
        </p>

        <p className="mt-2 text-3xl font-black text-amber-900">
          {pendingCount}
        </p>

        <p className="mt-1 text-sm text-amber-800">
          Awaiting payment verification
        </p>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-sm font-bold text-emerald-700">
          Completed
        </p>

        <p className="mt-2 text-3xl font-black text-emerald-900">
          {completedCount}
        </p>

        <p className="mt-1 text-sm text-emerald-800">
          Investments created
        </p>
      </div>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-bold text-red-700">
          Rejected
        </p>

        <p className="mt-2 text-3xl font-black text-red-900">
          {rejectedCount}
        </p>

        <p className="mt-1 text-sm text-red-800">
          Funding requests rejected
        </p>
      </div>
    </div>

    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-xl font-black text-slate-900">
          Wealth Box Funding
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review every customer funding request
          before an investment is created.
        </p>
      </div>

      {fundings.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <p className="text-lg font-bold text-slate-900">
            No Wealth Box funding requests
          </p>

          <p className="mt-2 text-sm text-slate-500">
            New card and crypto funding requests
            will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {fundings.map((funding) => {
            const customerName =
              funding.user.fullName ||
              funding.user.email ||
              funding.user.phone ||
              "Unknown customer";

            const paymentIcon =
              funding.paymentMethod === "CRYPTO"
                ? Bitcoin
                : CreditCard;

            const PaymentIcon =
              paymentIcon;

            return (
              <div
                key={funding.id}
                className="p-6 transition hover:bg-slate-50"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <PaymentIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {funding.paymentMethod}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                            funding.status,
                          )}`}
                        >
                          {funding.status}
                        </span>
                      </div>

                      <p className="mt-2 font-bold text-slate-900">
                        {customerName}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {funding.plan.name} ·{" "}
                        {funding.durationDays} days ·{" "}
                        {Number(
                          funding.returnPercentage,
                        )}
                        % return
                      </p>

                      <p className="mt-1 break-all text-xs font-medium text-slate-400">
                        {funding.externalReference ||
                          funding.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-black text-slate-900">
                        {formatCurrency(
                          Number(
                            funding.principalLocal,
                          ),
                          funding.localCurrency,
                        )}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {formatCurrency(
                          Number(
                            funding.principalUsd,
                          ),
                          "USD",
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(
                          funding.createdAt,
                        )}
                      </p>
                    </div>

                    <Link
                      href={`/admin/wealth-box/${funding.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      Review
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {funding.paymentMethod ===
                "CRYPTO" ? (
                  <div className="mt-4 rounded-2xl bg-violet-50 px-4 py-3">
                    <p className="text-xs font-bold text-violet-800">
                      {funding.cryptoDeposit?.asset} ·{" "}
                      {
                        funding.cryptoDeposit
                          ?.network
                      }
                    </p>

                    {funding.cryptoDeposit
                      ?.transactionHash ? (
                      <p className="mt-1 break-all text-xs text-violet-700">
                        TX:{" "}
                        {
                          funding.cryptoDeposit
                            .transactionHash
                        }
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-violet-700">
                        Transaction hash not yet
                        recorded.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  </div>
</div>

);
}
