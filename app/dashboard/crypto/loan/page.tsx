import { ArrowLeft, HandCoins } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import CryptoFinancePanel from "@/components/crypto/crypto-finance-panel";

export default async function CryptoLoanPage() {
  const { user } = await getCurrentUser();

  const [loans, conversions] = await Promise.all([
    prisma.cryptoLoan.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        reference: true,
        principalAmount: true,
        collateralAmount: true,
        principalUsdValue: true,
        repaidAmount: true,
        status: true,
        createdAt: true,
        borrowedCryptoBalance: {
          select: {
            asset: true,
            network: true,
            balance: true,
            reservedBalance: true,
          },
        },
        cryptoBalance: {
          select: {
            asset: true,
            network: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    prisma.cryptoCashConversion.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        reference: true,
        asset: true,
        network: true,
        cryptoAmount: true,
        payoutAmount: true,
        payoutCurrency: true,
        bankName: true,
        accountName: true,
        accountNumberLast4: true,
        status: true,
        quoteExpiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <HandCoins className="h-4 w-4" />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Crypto Loan
            </h1>
            <p className="text-xs text-slate-500">
              Apply for a loan, make repayments, and review your loan history.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/crypto"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Crypto
        </Link>
      </div>

      <CryptoFinancePanel
        mode="loan"
        loans={loans.map((loan) => ({
          id: loan.id,
          reference: loan.reference,
          principalAmount: loan.principalAmount.toString(),
          outstandingAmount: loan.principalAmount.sub(loan.repaidAmount).toString(),
          collateralAmount: loan.collateralAmount.toString(),
          principalUsdValue: loan.principalUsdValue.toString(),
          repaidAmount: loan.repaidAmount.toString(),
          status: loan.status,
          createdAt: loan.createdAt.toISOString(),
          borrowedAsset: loan.borrowedCryptoBalance.asset,
          borrowedNetwork: loan.borrowedCryptoBalance.network,
          borrowedAvailable: loan.borrowedCryptoBalance.balance
            .sub(loan.borrowedCryptoBalance.reservedBalance)
            .toString(),
          collateralAsset: loan.cryptoBalance.asset,
          collateralNetwork: loan.cryptoBalance.network,
        }))}
        conversions={conversions.map((conversion) => ({
          id: conversion.id,
          reference: conversion.reference,
          asset: conversion.asset,
          network: conversion.network,
          cryptoAmount: conversion.cryptoAmount.toString(),
          payoutAmount: conversion.payoutAmount.toString(),
          payoutCurrency: conversion.payoutCurrency,
          bankName: conversion.bankName,
          accountName: conversion.accountName,
          accountNumberLast4: conversion.accountNumberLast4,
          status: conversion.status,
          quoteExpiresAt: conversion.quoteExpiresAt.toISOString(),
          createdAt: conversion.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
