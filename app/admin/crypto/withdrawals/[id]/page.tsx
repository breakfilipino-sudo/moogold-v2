import {
  ArrowDownRight,
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  Clock3,
  Coins,
  ExternalLink,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import ReviewActions from "./review-actions";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatNetwork(network: string) {
  switch (network) {
    case "ETHEREUM":
      return "Ethereum (ERC-20)";

    case "TRON":
      return "Tron (TRC-20)";

    case "BITCOIN":
      return "Bitcoin";

    case "SOLANA":
      return "Solana";

    case "STELLAR":
      return "Stellar";

    default:
      return network;
  }
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default async function AdminCryptoWithdrawalPage({
  params,
}: PageProps) {
  const { id } = await params;

  const withdrawal =
    await prisma.cryptoWithdrawal.findUnique({
      where: {
        id,
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
            createdAt: true,
          },
        },

        cryptoBalance: {
          select: {
            id: true,
            asset: true,
            network: true,
            balance: true,
          },
        },
      },
    });

  if (!withdrawal) {
    notFound();
  }

  const customerName =
    withdrawal.user.fullName ||
    withdrawal.user.email ||
    withdrawal.user.phone ||
    "Unknown customer";

  const canReview =
    withdrawal.status === "PENDING" ||
    withdrawal.status === "PROCESSING";

  const currentBalance =
    withdrawal.cryptoBalance.balance;

  const totalAmount =
    withdrawal.totalAmount;

  const balanceAfterApproval =
    currentBalance.sub(totalAmount);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/admin/crypto/withdrawals"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Crypto Withdrawals
        </Link>

        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              {withdrawal.asset === "BTC" ? (
                <Bitcoin className="h-7 w-7" />
              ) : (
                <Coins className="h-7 w-7" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Crypto Withdrawal Review
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {withdrawal.amount.toString()}{" "}
                {withdrawal.asset}
              </h1>
            </div>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${getStatusClasses(
              withdrawal.status,
            )}`}
          >
            {withdrawal.status}
          </span>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {/* CUSTOMER */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-500" />

                <h2 className="text-xl font-black text-slate-900">
                  Customer
                </h2>
              </div>

              <div className="mt-5">
                <DetailRow
                  label="Customer"
                  value={customerName}
                />

                <DetailRow
                  label="Email"
                  value={
                    withdrawal.user.email ||
                    "Not provided"
                  }
                />

                <DetailRow
                  label="Phone"
                  value={
                    withdrawal.user.phone ||
                    "Not provided"
                  }
                />

                <DetailRow
                  label="User ID"
                  value={withdrawal.user.id}
                />

                <DetailRow
                  label="Account Created"
                  value={formatDate(
                    withdrawal.user.createdAt,
                  )}
                />
              </div>
            </section>

            {/* WITHDRAWAL */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ArrowDownRight className="h-5 w-5 text-slate-500" />

                <h2 className="text-xl font-black text-slate-900">
                  Withdrawal Information
                </h2>
              </div>

              <div className="mt-5">
                <DetailRow
                  label="Asset"
                  value={withdrawal.asset}
                />

                <DetailRow
                  label="Network"
                  value={formatNetwork(
                    withdrawal.network,
                  )}
                />

                <DetailRow
                  label="Withdrawal Amount"
                  value={`${withdrawal.amount.toString()} ${withdrawal.asset}`}
                />

                <DetailRow
                  label="Withdrawal Fee"
                  value={`${withdrawal.fee.toString()} ${withdrawal.asset}`}
                />

                <DetailRow
                  label="Total Deducted"
                  value={`${withdrawal.totalAmount.toString()} ${withdrawal.asset}`}
                />

                {withdrawal.usdAmount !== null && (
                  <DetailRow
                    label="Estimated USD Value"
                    value={`$${Number(
                      withdrawal.usdAmount.toString(),
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
                  />
                )}

                {withdrawal.exchangeRate !== null && (
                  <DetailRow
                    label="Exchange Rate"
                    value={`$${Number(
                      withdrawal.exchangeRate.toString(),
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8,
                    })}`}
                  />
                )}

                <DetailRow
                  label="Submitted"
                  value={formatDate(
                    withdrawal.createdAt,
                  )}
                />

                <DetailRow
                  label="Withdrawal ID"
                  value={withdrawal.id}
                />
              </div>
            </section>

            {/* DESTINATION */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-slate-500" />

                <h2 className="text-xl font-black text-slate-900">
                  Destination
                </h2>
              </div>

              <div className="mt-5">
                <DetailRow
                  label="Destination Address"
                  value={
                    withdrawal.destinationAddress
                  }
                />
              </div>
            </section>

            {/* BLOCKCHAIN */}
            {(withdrawal.transactionHash ||
              withdrawal.blockNumber !== null ||
              withdrawal.confirmations !== null) && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-slate-500" />

                  <h2 className="text-xl font-black text-slate-900">
                    Blockchain Information
                  </h2>
                </div>

                <div className="mt-5">
                  {withdrawal.transactionHash && (
                    <DetailRow
                      label="Transaction Hash"
                      value={
                        withdrawal.transactionHash
                      }
                    />
                  )}

                  {withdrawal.blockNumber !==
                    null && (
                    <DetailRow
                      label="Block Number"
                      value={
                        withdrawal.blockNumber
                      }
                    />
                  )}

                  {withdrawal.confirmations !==
                    null && (
                    <DetailRow
                      label="Confirmations"
                      value={String(
                        withdrawal.confirmations,
                      )}
                    />
                  )}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-8">
            {/* BALANCE */}
            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-blue-600" />

                <h2 className="text-lg font-black text-blue-950">
                  Crypto Balance
                </h2>
              </div>

              <p className="mt-5 text-sm font-semibold text-blue-700">
                Current user balance
              </p>

              <p className="mt-1 break-all text-3xl font-black text-blue-950">
                {currentBalance.toString()}{" "}
                {withdrawal.asset}
              </p>

              {canReview && (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-white/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    After approval
                  </p>

                  <p className="mt-1 break-all text-lg font-black text-blue-950">
                    {balanceAfterApproval.toString()}{" "}
                    {withdrawal.asset}
                  </p>

                  {balanceAfterApproval.lt(0) && (
                    <p className="mt-2 text-xs font-bold leading-5 text-red-600">
                      Insufficient crypto balance for this
                      withdrawal.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* REVIEW */}
            {canReview ? (
              <ReviewActions
                withdrawalId={withdrawal.id}
              />
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  {withdrawal.status ===
                  "COMPLETED" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : withdrawal.status ===
                    "REJECTED" ? (
                    <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  ) : (
                    <Clock3 className="mt-0.5 h-5 w-5 text-slate-500" />
                  )}

                  <div>
                    <h2 className="font-black text-slate-900">
                      Review Complete
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      This withdrawal is no longer
                      available for approval or rejection.
                    </p>

                    {withdrawal.status ===
                      "COMPLETED" && (
                      <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                          Amount Sent
                        </p>

                        <p className="mt-2 text-lg font-black text-emerald-950">
                          {withdrawal.amount.toString()}{" "}
                          {withdrawal.asset}
                        </p>
                      </div>
                    )}

                    {withdrawal.rejectionReason && (
                      <div className="mt-4 rounded-2xl bg-red-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                          Rejection Reason
                        </p>

                        <p className="mt-2 text-sm leading-6 text-red-900">
                          {withdrawal.rejectionReason}
                        </p>
                      </div>
                    )}

                    {withdrawal.reviewedAt && (
                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Reviewed
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDate(
                            withdrawal.reviewedAt,
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}