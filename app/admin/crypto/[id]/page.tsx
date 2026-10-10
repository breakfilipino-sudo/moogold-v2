import {
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function AdminCryptoDepositPage({
  params,
}: PageProps) {
  const { id } = await params;

  const { prisma } = await import("@/lib/prisma");

  const deposit =
    await prisma.cryptoDeposit.findUnique({
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

  if (!deposit) {
    notFound();
  }

  const customerName =
    deposit.user.fullName ||
    deposit.user.email ||
    deposit.user.phone ||
    "Unknown customer";

  const canReview =
    deposit.status === "PENDING" ||
    deposit.status === "PROCESSING";

  const currentBalance =
    deposit.cryptoBalance?.balance ?? 0;

  const balanceAfterApproval =
  deposit.amount !== null
    ? currentBalance.add(deposit.amount)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Back navigation */}
        <Link
          href="/admin/crypto"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Crypto Deposits
        </Link>

        {/* Header */}
        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <Bitcoin className="h-7 w-7" />
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Crypto Deposit Review
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                {deposit.amount !== null
  ? `${deposit.amount.toString()} ${deposit.asset}`
  : "Awaiting verification"}
              </h1>
            </div>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-bold ${getStatusClasses(
              deposit.status,
            )}`}
          >
            {deposit.status}
          </span>
        </div>

        {/* Main content */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            {/* Customer */}
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
                    deposit.user.email ||
                    "Not provided"
                  }
                />

                <DetailRow
                  label="Phone"
                  value={
                    deposit.user.phone ||
                    "Not provided"
                  }
                />

                <DetailRow
                  label="User ID"
                  value={deposit.user.id}
                />

                <DetailRow
                  label="Account Created"
                  value={formatDate(
                    deposit.user.createdAt,
                  )}
                />
              </div>
            </section>

            {/* Deposit information */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Bitcoin className="h-5 w-5 text-slate-500" />

                <h2 className="text-xl font-black text-slate-900">
                  Deposit Information
                </h2>
              </div>

              <div className="mt-5">
                <DetailRow
                  label="Asset"
                  value={deposit.asset}
                />

                <DetailRow
                  label="Network"
                  value={formatNetwork(
                    deposit.network,
                  )}
                />

                <DetailRow
                  label="Amount"
                  value={
  deposit.amount !== null
    ? `${deposit.amount.toString()} ${deposit.asset}`
    : "Awaiting verification"
}
                />

                <DetailRow
                  label="MooGold Receiving Address"
                  value={deposit.receivingAddress}
                />

                <DetailRow
                  label="Submitted"
                  value={formatDate(
                    deposit.createdAt,
                  )}
                />

                <DetailRow
                  label="Deposit ID"
                  value={deposit.id}
                />
              </div>
            </section>

            {/* User-submitted blockchain information */}
            {(deposit.transactionHash ||
              deposit.senderAddress ||
              deposit.blockNumber !== null ||
              deposit.confirmations !== null) && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-slate-500" />

                  <h2 className="text-xl font-black text-slate-900">
                    Blockchain Information
                  </h2>
                </div>

                <div className="mt-5">
                  {deposit.transactionHash && (
                    <DetailRow
                      label="Transaction Hash"
                      value={
                        deposit.transactionHash
                      }
                    />
                  )}

                  {deposit.senderAddress && (
                    <DetailRow
                      label="Sender Address"
                      value={
                        deposit.senderAddress
                      }
                    />
                  )}

                  {deposit.blockNumber !== null && (
                    <DetailRow
                      label="Block Number"
                      value={
                        deposit.blockNumber
                      }
                    />
                  )}

                  {deposit.confirmations !== null && (
                    <DetailRow
                      label="Confirmations"
                      value={String(
                        deposit.confirmations,
                      )}
                    />
                  )}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            {/* Crypto balance */}
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />

                <h2 className="text-lg font-black text-emerald-950">
                  Crypto Balance
                </h2>
              </div>

              <p className="mt-5 text-sm font-semibold text-emerald-700">
                Current user balance
              </p>

              <p className="mt-1 text-3xl font-black text-emerald-950">
                {currentBalance.toString()}{" "}
                {deposit.asset}
              </p>

              {canReview && balanceAfterApproval !== null && (
  <div className="mt-5 rounded-2xl border border-emerald-200 bg-white/70 p-4">
    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
      After approval
    </p>
    <p className="mt-1 text-lg font-black text-emerald-950">
      {balanceAfterApproval.toString()} {deposit.asset}
    </p>
  </div>
)}
            </section>

            {/* Review controls */}
            {canReview ? (
              <ReviewActions
                depositId={deposit.id}
                asset={deposit.asset}
                currentAmount={deposit.amount?.toString() ?? ""}
              />
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  {deposit.status ===
                  "COMPLETED" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <Clock3 className="mt-0.5 h-5 w-5 text-slate-500" />
                  )}

                  <div>
                    <h2 className="font-black text-slate-900">
                      Review Complete
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      This deposit is no longer
                      available for approval or
                      rejection.
                    </p>

                    {deposit.status ===
                      "COMPLETED" && (
                      <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                          Credited Amount
                        </p>

                        <p className="mt-2 text-lg font-black text-emerald-950">
                          {deposit.amount !== null
  ? `${deposit.amount.toString()} ${deposit.asset}`
  : "Amount unavailable"}
                          {deposit.asset}
                        </p>
                      </div>
                    )}

                    {deposit.rejectionReason && (
                      <div className="mt-4 rounded-2xl bg-red-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                          Rejection Reason
                        </p>

                        <p className="mt-2 text-sm leading-6 text-red-900">
                          {deposit.rejectionReason}
                        </p>
                      </div>
                    )}

                    {deposit.reviewedAt && (
                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Reviewed
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDate(
                            deposit.reviewedAt,
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
