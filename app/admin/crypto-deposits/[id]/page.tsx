import {
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  Clock3,
  Hash,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  approveCryptoDeposit,
  rejectCryptoDeposit,
} from "../actions";

type AdminCryptoDepositPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 18,
  }).format(value);
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

function statusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    case "PROCESSING":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default async function AdminCryptoDepositPage({
  params,
}: AdminCryptoDepositPageProps) {
  const { id } = await params;

  const deposit =
    await prisma.cryptoDeposit.findUnique({
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
            createdAt: true,
          },
        },

        cryptoBalance: {
          select: {
            id: true,
            balance: true,
          },
        },
      },
    });

  if (!deposit) {
    notFound();
  }

  const customer =
    deposit.user.fullName ||
    deposit.user.email ||
    deposit.user.phone ||
    "Unknown customer";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/admin/crypto-deposits"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Crypto Deposits
        </Link>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-600">
              Crypto Deposit Review
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
              Verify Deposit
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Verify the blockchain transaction before crediting the
              customer&apos;s crypto balance.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-black ${statusClasses(
              deposit.status,
            )}`}
          >
            {deposit.status}
          </span>
        </div>

        <div className="mt-10 grid gap-8 xl:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Bitcoin className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Deposit ID
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-black text-slate-900">
                    {deposit.id}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8 p-8">
              {/* Asset */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-500">
                    Asset
                  </p>

                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {deposit.asset}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {deposit.network}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-6">
                  <p className="text-sm font-semibold text-emerald-700">
                    Customer submitted
                  </p>

                  <p className="mt-2 text-3xl font-black text-emerald-700">
                    {formatAmount(
                      Number(deposit.amount),
                    )}{" "}
                    {deposit.asset}
                  </p>

                  <p className="mt-1 text-sm text-emerald-600">
                    Verify this amount against the blockchain.
                  </p>
                </div>
              </div>

              {/* Receiving address */}
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Receiving Address
                </h2>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="break-all font-mono text-sm leading-6 text-slate-700">
                    {deposit.receivingAddress}
                  </p>
                </div>
              </div>

              {/* Transaction hash */}
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Blockchain Information
                </h2>

                <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  <InfoRow
                    icon={<Hash className="h-4 w-4" />}
                    label="Transaction Hash"
                    value={
                      deposit.transactionHash ||
                      "Not provided"
                    }
                    mono
                  />

                  <InfoRow
                    label="Sender Address"
                    value={
                      deposit.senderAddress ||
                      "Not provided"
                    }
                    mono
                  />

                  <InfoRow
                    label="Block Number"
                    value={
                      deposit.blockNumber ||
                      "Not provided"
                    }
                  />

                  <InfoRow
                    label="Confirmations"
                    value={
                      deposit.confirmations === null
                        ? "Not provided"
                        : String(
                            deposit.confirmations,
                          )
                    }
                  />
                </div>
              </div>

              {/* Customer */}
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Customer
                </h2>

                <div className="mt-4 rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                      <User className="h-6 w-6" />
                    </div>

                    <div>
                      <p className="font-black text-slate-900">
                        {customer}
                      </p>

                      {deposit.user.email && (
                        <p className="mt-1 text-sm text-slate-500">
                          {deposit.user.email}
                        </p>
                      )}

                      {deposit.user.phone && (
                        <p className="mt-1 text-sm text-slate-500">
                          {deposit.user.phone}
                        </p>
                      )}

                      <p className="mt-3 text-xs text-slate-400">
                        User ID: {deposit.user.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {deposit.status === "PENDING" && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-7">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                    <div>
                      <h2 className="font-black text-slate-900">
                        Blockchain verification
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Check the blockchain explorer yourself. Confirm that
                        the transaction was sent to the MooGold receiving
                        address, that the asset and network are correct, and
                        enter the actual amount received.
                      </p>
                    </div>
                  </div>

                  <form
                    action={approveCryptoDeposit}
                    className="mt-7 space-y-5"
                  >
                    <input
                      type="hidden"
                      name="depositId"
                      value={deposit.id}
                    />

                    <div>
                      <label
                        htmlFor="verifiedAmount"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Verified amount received
                      </label>

                      <div className="relative">
                        <input
                          id="verifiedAmount"
                          name="verifiedAmount"
                          type="text"
                          inputMode="decimal"
                          defaultValue={String(
                            deposit.amount,
                          )}
                          placeholder="0.00000000"
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 pr-20 text-lg font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        />

                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                          {deposit.asset}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        This is the amount that will actually be credited.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="transactionHash"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Transaction hash
                      </label>

                      <input
                        id="transactionHash"
                        name="transactionHash"
                        type="text"
                        defaultValue={
                          deposit.transactionHash ||
                          ""
                        }
                        placeholder="Blockchain transaction hash"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-mono text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="senderAddress"
                        className="mb-2 block text-sm font-bold text-slate-700"
                      >
                        Sender address
                      </label>

                      <input
                        id="senderAddress"
                        name="senderAddress"
                        type="text"
                        defaultValue={
                          deposit.senderAddress ||
                          ""
                        }
                        placeholder="Sender blockchain address"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 font-mono text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="blockNumber"
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          Block number
                        </label>

                        <input
                          id="blockNumber"
                          name="blockNumber"
                          type="text"
                          defaultValue={
                            deposit.blockNumber ||
                            ""
                          }
                          placeholder="Optional"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="confirmations"
                          className="mb-2 block text-sm font-bold text-slate-700"
                        >
                          Confirmations
                        </label>

                        <input
                          id="confirmations"
                          name="confirmations"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={
                            deposit.confirmations ??
                            ""
                          }
                          placeholder="Optional"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Verify &amp; Approve Deposit
                    </button>
                  </form>

                  <form
                    action={rejectCryptoDeposit}
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="depositId"
                      value={deposit.id}
                    />

                    <input
                      type="hidden"
                      name="reason"
                      value="Blockchain transaction could not be verified."
                    />

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-black text-red-700 transition hover:bg-red-50"
                    >
                      <XCircle className="h-5 w-5" />
                      Reject Deposit
                    </button>
                  </form>

                  <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                    Approval credits the verified amount exactly once and
                    creates the corresponding immutable crypto ledger entry.
                  </p>
                </div>
              )}

              {deposit.status !== "PENDING" && (
                <div className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />

                  <p className="text-sm leading-6 text-slate-500">
                    This crypto deposit has already been processed. No further
                    administrative action is available.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">
                Current Crypto Balance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Balance before this deposit is approved.
              </p>

              <p className="mt-6 text-3xl font-black text-slate-900">
                {formatAmount(
                  Number(
                    deposit.cryptoBalance.balance,
                  ),
                )}{" "}
                {deposit.asset}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {deposit.network}
              </p>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-600" />

                <h2 className="font-black text-amber-950">
                  Verify before approval
                </h2>
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-amber-800">
                <li>• Correct blockchain network</li>
                <li>• Correct MooGold receiving address</li>
                <li>• Correct cryptocurrency</li>
                <li>• Correct transaction hash</li>
                <li>• Actual amount received</li>
                <li>• Sufficient confirmations</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-7">
              <p className="text-sm font-semibold text-slate-500">
                Submitted
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {formatDate(deposit.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
        {icon}
        {label}
      </span>

      <span
        className={`max-w-xl break-all text-right font-semibold text-slate-900 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}