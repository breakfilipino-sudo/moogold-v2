import Link from "next/link";
import {
ArrowLeft,
Bitcoin,
CalendarDays,
CheckCircle2,
CreditCard,
User,
} from "lucide-react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import {
approveWealthFunding,
rejectWealthFunding,
} from "../actions";

export const dynamic = "force-dynamic";

type PageProps = {
params: Promise<{
id: string;
}>;
};

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
month: "long",
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

case "REJECTED":
  return "bg-red-100 text-red-700";

case "PROCESSING":
  return "bg-blue-100 text-blue-700";

case "CANCELLED":
  return "bg-slate-100 text-slate-600";

default:
  return "bg-amber-100 text-amber-700";

}
}

export default async function AdminWealthBoxDetailPage({
params,
}: PageProps) {
const { id } = await params;

const funding =
await prisma.wealthFunding.findUnique({
where: {
id,
},
include: {
user: {
select: {
id: true,
fullName: true,
email: true,
phone: true,
countryCode: true,
createdAt: true,
},
},
plan: {
select: {
name: true,
durationDays: true,
returnPercentage: true,
minimumUsd: true,
maximumUsd: true,
},
},
cryptoDeposit: {
select: {
asset: true,
network: true,
amount: true,
usdAmount: true,
receivingAddress: true,
transactionHash: true,
senderAddress: true,
blockNumber: true,
confirmations: true,
status: true,
createdAt: true,
},
},
reviewedBy: {
select: {
fullName: true,
email: true,
},
},
},
});

if (!funding) {
notFound();
}

const customerName =
funding.user.fullName ||
funding.user.email ||
funding.user.phone ||
"Unknown customer";

const isPending =
funding.status === "PENDING";

const PaymentIcon =
funding.paymentMethod === "CRYPTO"
? Bitcoin
: CreditCard;

return ( <div className="min-h-screen bg-slate-50"> <div className="mx-auto max-w-5xl px-6 py-10"> <Link
       href="/admin/wealth-box"
       className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
     > <ArrowLeft className="h-4 w-4" />
Back to Wealth Box </Link>

    <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
          Wealth Box Review
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Funding Details
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Verify the payment before creating the
          customer&apos;s Wealth Box investment.
        </p>
      </div>

      <span
        className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${getStatusClasses(
          funding.status,
        )}`}
      >
        {funding.status}
      </span>
    </div>

    <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <PaymentIcon className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Payment
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                {funding.paymentMethod ===
                "CRYPTO"
                  ? "Crypto payment"
                  : "Credit / debit card"}
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Amount
              </span>

              <span className="text-lg font-black text-slate-900">
                {formatCurrency(
                  Number(
                    funding.principalLocal,
                  ),
                  funding.localCurrency,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                USD value
              </span>

              <span className="font-bold text-emerald-700">
                {formatCurrency(
                  Number(
                    funding.principalUsd,
                  ),
                  "USD",
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Exchange rate
              </span>

              <span className="font-semibold text-slate-900">
                {Number(
                  funding.exchangeRate,
                ).toFixed(8)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Reference
              </span>

              <span className="break-all text-right text-xs font-bold text-slate-900">
                {funding.externalReference ||
                  funding.id}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Created
              </span>

              <span className="text-right text-sm font-semibold text-slate-900">
                {formatDate(
                  funding.createdAt,
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-emerald-600" />

            <h2 className="text-lg font-black text-slate-900">
              Wealth Box plan
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Plan
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {funding.plan.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Duration
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {funding.durationDays} days
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Return
              </p>

              <p className="mt-1 font-bold text-emerald-700">
                {Number(
                  funding.returnPercentage,
                )}
                %
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Projected profit
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {formatCurrency(
                  Number(
                    funding.projectedProfitUsd,
                  ),
                  "USD",
                )}
              </p>
            </div>
          </div>
        </section>

        {funding.paymentMethod ===
        "CRYPTO" ? (
          <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
            <div className="flex items-center gap-3">
              <Bitcoin className="h-5 w-5 text-violet-700" />

              <h2 className="text-lg font-black text-violet-950">
                Crypto payment details
              </h2>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-violet-700">
                  Asset
                </span>

                <span className="font-bold text-violet-950">
                  {funding.cryptoDeposit
                    ?.asset ?? "—"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-violet-700">
                  Network
                </span>

                <span className="font-bold text-violet-950">
                  {funding.cryptoDeposit
                    ?.network ?? "—"}
                </span>
              </div>

              <div>
                <p className="text-violet-700">
                  Receiving address
                </p>

                <p className="mt-1 break-all rounded-xl bg-white p-3 text-xs font-semibold text-violet-950">
                  {funding.cryptoDeposit
                    ?.receivingAddress ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-violet-700">
                  Transaction hash
                </p>

                <p className="mt-1 break-all rounded-xl bg-white p-3 text-xs font-semibold text-violet-950">
                  {funding.cryptoDeposit
                    ?.transactionHash ??
                    "Not recorded yet"}
                </p>
              </div>

              {funding.cryptoDeposit
                ?.senderAddress ? (
                <div>
                  <p className="text-violet-700">
                    Sender address
                  </p>

                  <p className="mt-1 break-all rounded-xl bg-white p-3 text-xs font-semibold text-violet-950">
                    {
                      funding.cryptoDeposit
                        .senderAddress
                    }
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-violet-700">
                    Confirmations
                  </p>

                  <p className="mt-1 font-bold text-violet-950">
                    {funding.cryptoDeposit
                      ?.confirmations ??
                      0}
                  </p>
                </div>

                <div>
                  <p className="text-violet-700">
                    Blockchain status
                  </p>

                  <p className="mt-1 font-bold text-violet-950">
                    {funding.cryptoDeposit
                      ?.status ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-emerald-600" />

            <h2 className="text-lg font-black text-slate-900">
              Customer
            </h2>
          </div>

          <p className="mt-5 text-lg font-black text-slate-900">
            {customerName}
          </p>

          {funding.user.email ? (
            <p className="mt-1 break-all text-sm text-slate-500">
              {funding.user.email}
            </p>
          ) : null}

          {funding.user.phone ? (
            <p className="mt-1 text-sm text-slate-500">
              {funding.user.phone}
            </p>
          ) : null}

          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {funding.user.countryCode ||
              "Country unavailable"}
          </p>
        </section>

        {isPending ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />

              <h2 className="text-lg font-black text-emerald-950">
                Payment verification
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-emerald-900/75">
              Confirm that the customer payment
              has been received before approving.
              Approval creates the active Wealth
              Box investment.
            </p>

            <form
              action={approveWealthFunding}
              className="mt-5"
            >
              <input
                type="hidden"
                name="fundingId"
                value={funding.id}
              />

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-5 py-4 text-sm font-bold text-white transition hover:bg-emerald-800"
              >
                Approve funding
              </button>
            </form>
          </section>
        ) : null}

        {isPending ? (
          <section className="rounded-3xl border border-red-200 bg-white p-6">
            <h2 className="text-lg font-black text-slate-900">
              Reject funding
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Provide a reason so the rejection is
              recorded with the funding request.
            </p>

            <form
              action={rejectWealthFunding}
              className="mt-5 space-y-4"
            >
              <input
                type="hidden"
                name="fundingId"
                value={funding.id}
              />

              <textarea
                name="reason"
                required
                maxLength={500}
                rows={4}
                placeholder="Reason for rejection"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:bg-white"
              />

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
              >
                Reject funding
              </button>
            </form>
          </section>
        ) : null}

        {!isPending ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold text-slate-900">
              This funding request is{" "}
              {funding.status.toLowerCase()}.
            </p>

            {funding.reviewedAt ? (
              <p className="mt-2 text-sm text-slate-500">
                Reviewed{" "}
                {formatDate(
                  funding.reviewedAt,
                )}
                {funding.reviewedBy
                  ? ` by ${
                      funding.reviewedBy.fullName ||
                      funding.reviewedBy.email ||
                      "Admin"
                    }`
                  : ""}
              </p>
            ) : null}

            {funding.rejectionReason ? (
              <div className="mt-4 rounded-2xl bg-red-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Rejection reason
                </p>

                <p className="mt-2 text-sm leading-6 text-red-900">
                  {funding.rejectionReason}
                </p>
              </div>
            ) : null}

            {funding.investmentId ? (
              <p className="mt-4 break-all text-xs font-semibold text-emerald-700">
                Investment:{" "}
                {funding.investmentId}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  </div>
</div>

);
}
