"use client";

import Link from "next/link";
import {
  HandCoins,
  Landmark,
  Wallet,
  WalletCards,
  ArrowLeftRight,
} from "lucide-react";

type WithdrawalBalance = {
  id: string;
  asset: string;
  network: string;
  balance: string;
};

type WithdrawalRecord = {
  id: string;
  asset: string;
  network: string;
  amount: string;
  fee: string;
  totalAmount: string;
  destinationAddress: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};

type LoanRecord = {
  id: string;
  reference: string;
  principalAmount: string;
  outstandingAmount: string;
  collateralAmount: string;
  principalUsdValue: string;
  repaidAmount: string;
  status: string;
  createdAt: string;
  borrowedAsset: string;
  borrowedNetwork: string;
  borrowedAvailable: string;
  collateralAsset: string;
  collateralNetwork: string;
};

type ConversionRecord = {
  id: string;
  reference: string;
  asset: string;
  network: string;
  cryptoAmount: string;
  payoutAmount: string;
  payoutCurrency: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string | null;
  status: string;
  quoteExpiresAt: string;
  createdAt: string;
};

type Props = {
  totalCryptoUsd: number;
  registeredFullName: string | null;
  bankOptions: string[];
  withdrawalBalances: WithdrawalBalance[];
  withdrawalHistory: WithdrawalRecord[];
  loans: LoanRecord[];
  conversions: ConversionRecord[];
  walletCashBalance: string;
  walletCurrency: string;
};

export default function CryptoActionModals(props: Props) {
  void props;

  const triggerClass =
    "group inline-flex min-h-[76px] w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:min-h-[64px] sm:flex-row sm:gap-2.5 sm:rounded-xl sm:px-4";

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 sm:h-10 sm:w-10">
              <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-950 sm:text-base">
                Trade Crypto
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                Buy or sell crypto
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/dashboard/crypto/buy"
              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:min-h-10 sm:px-4 sm:text-sm"
            >
              Buy
            </Link>

            <Link
              href="/dashboard/crypto/sell"
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:min-h-10 sm:px-4 sm:text-sm"
            >
              Sell
            </Link>
          </div>
        </div>
      </section>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3">
        <Link
          href="/dashboard/crypto/deposit"
          className={`${triggerClass} border-[#B8872E] bg-gradient-to-br from-[#E6C875] to-[#C49A3A] text-[#17291F] shadow-amber-900/10 hover:from-[#EBD184] hover:to-[#D0A746]`}
        >
          <WalletCards className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
          Deposit
        </Link>

        <Link
          href="/dashboard/crypto/withdrawal"
          className={`${triggerClass} border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/70`}
        >
          <Wallet className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
          Withdraw
        </Link>

        <Link
          href="/dashboard/crypto/loan"
          className={`${triggerClass} border-emerald-200 bg-[#F1F7F3] text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50`}
        >
          <HandCoins className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
          Crypto Loan
        </Link>

        <Link
          href="/dashboard/crypto/conversion"
          className={`${triggerClass} border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/70`}
        >
          <Landmark className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
          Convert to Cash
        </Link>
      </div>
    </div>
  );
}
