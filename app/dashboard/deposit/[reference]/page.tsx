import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getAvailableLanguages,
  getSupportedLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";

type DepositReviewPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const LABELS: Record<
  LanguageCode,
  {
    wallet: string;
    title: string;
    account: string;
    amount: string;
    paymentMethod: string;
    cardDescription: string;
    back: string;
    continue: string;
  }
> = {
  en: {
    wallet: "Wallet",
    title: "Review Add Fund",
    account: "Account",
    amount: "Amount to add",
    paymentMethod: "Payment method",
    cardDescription: "Visa, Mastercard and more",
    back: "Back",
    continue: "Continue to Cash In",
  },
  fil: {
    wallet: "Wallet",
    title: "Suriin ang Pagdaragdag ng Pondo",
    account: "Account",
    amount: "Halagang idaragdag",
    paymentMethod: "Paraan ng pagbabayad",
    cardDescription: "Visa, Mastercard at iba pa",
    back: "Bumalik",
    continue: "Magpatuloy sa Pagdaragdag ng Pondo",
  },
  ms: {
    wallet: "Dompet",
    title: "Semak Tambah Dana",
    account: "Akaun",
    amount: "Jumlah untuk ditambah",
    paymentMethod: "Kaedah pembayaran",
    cardDescription: "Visa, Mastercard dan lain-lain",
    back: "Kembali",
    continue: "Teruskan untuk Tambah Dana",
  },
  zh: {
    wallet: "钱包",
    title: "确认添加资金",
    account: "账户",
    amount: "添加金额",
    paymentMethod: "付款方式",
    cardDescription: "Visa、Mastercard 等",
    back: "返回",
    continue: "继续添加资金",
  },
};

export default async function DepositReviewPage({
  params,
}: DepositReviewPageProps) {
  const { reference } = await params;

  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      countryCode: true,
      preferredLanguage: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const deposit = await prisma.transaction.findFirst({
    where: {
      reference,
      userId: user.id,
      type: "DEPOSIT",
    },
    select: {
      amount: true,
      currency: true,
      usdAmount: true,
      status: true,
      reference: true,
    },
  });

  if (!deposit) {
    notFound();
  }

  if (deposit.status === "COMPLETED") {
    redirect("/dashboard/wallet");
  }

  if (deposit.status === "REJECTED") {
    redirect("/dashboard/transactions");
  }

  const cookieStore = await cookies();
  const cookieLanguage = cookieStore.get("moogold-language")?.value;
  const availableLanguages = getAvailableLanguages(user.countryCode);

  const language: LanguageCode = availableLanguages.some(
    (option) => option.code === cookieLanguage,
  )
    ? (cookieLanguage as LanguageCode)
    : getSupportedLanguage(
        user.preferredLanguage,
        user.countryCode,
      );

  const t = LABELS[language];

  const amount = Number(deposit.amount);

  const usdAmount = deposit.usdAmount
    ? Number(deposit.usdAmount)
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 pt-6 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="relative my-auto w-full max-w-lg rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/10 sm:p-5">

      {/* Back button at the top */}
      <div className="mb-4">
        <Link
          href="/dashboard/deposit"
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t.back}
        </Link>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Amount */}
        <div className="px-4 py-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t.amount}
          </p>

          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {formatAmount(amount, deposit.currency)}
          </p>

          {usdAmount !== null && deposit.currency !== "USD" && (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              ≈ ${usdAmount.toFixed(2)} USD
            </p>
          )}
        </div>

      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-2">

        <a
          href={`/dashboard/deposit/${reference}/special-card`}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-700/20 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 active:scale-[0.99]"
        >
          {t.continue}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
      </div>
    </div>
  );
}