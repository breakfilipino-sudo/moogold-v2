import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  Gift,
  Users,
  Wallet,
} from "lucide-react";

import ReferralLink from "@/components/dashboard/referrals/referral-link";

function formatMoney(
  amount: number | null | undefined,
  currency = "USD",
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

function statusLabel(status: string) {
  switch (status) {
    case "QUALIFIED":
      return "Qualified";
    case "REWARDED":
      return "Rewarded";
    case "REVOKED":
      return "Revoked";
    default:
      return "Pending";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "QUALIFIED":
      return "bg-blue-50 text-blue-700";
    case "REWARDED":
      return "bg-emerald-50 text-emerald-700";
    case "REVOKED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default async function ReferralsPage() {
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
      referralCode: true,
      wallet: {
        select: {
          referralBalance: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const referrals = await prisma.referral.findMany({
    where: {
      referrerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      rewardAmount: true,
      rewardCurrency: true,
      createdAt: true,
      referredUser: {
        select: {
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  const totalReferrals = referrals.length;

  const qualifiedReferrals = referrals.filter(
    (referral) =>
      referral.status === "QUALIFIED" ||
      referral.status === "REWARDED",
  ).length;

  const pendingReferrals = referrals.filter(
    (referral) => referral.status === "PENDING",
  ).length;

  const referralBalance = Number(
    user.wallet?.referralBalance ?? 0,
  );

  const referralCode = user.referralCode ?? "";

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const referralLink = referralCode
    ? `${siteUrl}/register?ref=${encodeURIComponent(
        referralCode,
      )}`
    : "";

  const canWithdraw = referralBalance >= 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9993]">
            Referrals
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#10201b]">
            Referral earnings
          </h1>

          <p className="mt-1 text-sm text-[#71827c]">
            Earn rewards when your referrals qualify.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-[#53655f]">
          <Gift className="h-4 w-4 text-[#b58a3a]" />
          $10 reward per qualified referral
        </div>
      </div>

      {/* Balance */}
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fbf5e9]">
              <Wallet className="h-5 w-5 text-[#b58a3a]" />
            </div>

            <div>
              <p className="text-xs font-medium text-[#8a9993]">
                Referral balance
              </p>

              <p className="mt-0.5 text-2xl font-semibold tracking-tight text-[#10201b]">
                {formatMoney(referralBalance)}
              </p>
            </div>
          </div>

          {canWithdraw ? (
            <Link
              href="/dashboard/referrals/withdraw"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10201b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19332b]"
            >
              Withdraw
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <div
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#e9eeeb] px-5 py-3 text-sm font-semibold text-[#9aa6a1]"
                aria-disabled="true"
              >
                Withdraw
                <ArrowRight className="h-4 w-4" />
              </div>

              <p className="text-right text-xs font-medium text-[#8a9993]">
                Available at $100.00
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-[#edf1ef] pt-4">
          <p className="text-xs leading-5 text-[#8a9993]">
            Referral earnings are separate from your main wallet balance.
            You can withdraw once your referral balance reaches $100.00.
          </p>
        </div>
      </section>

      {/* Referral link */}
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f6f3]">
            <Copy className="h-4 w-4 text-[#315c4d]" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#10201b]">
              Your referral link
            </h2>

            <p className="mt-0.5 text-xs text-[#8a9993]">
              Share this link with people you want to refer.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <ReferralLink referralLink={referralLink} />
        </div>

        <p className="mt-3 text-xs text-[#8a9993]">
          Referral code:{" "}
          <span className="font-semibold text-[#53655f]">
            {referralCode || "Not assigned"}
          </span>
        </p>
      </section>

      {/* Summary */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e1e9e5] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-[#315c4d]" />
            <p className="text-xs text-[#8a9993]">
              Total referrals
            </p>
          </div>

          <p className="mt-2 text-xl font-semibold text-[#10201b]">
            {totalReferrals}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e1e9e5] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-xs text-[#8a9993]">
              Qualified
            </p>
          </div>

          <p className="mt-2 text-xl font-semibold text-[#10201b]">
            {qualifiedReferrals}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e1e9e5] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock3 className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-[#8a9993]">
              Pending
            </p>
          </div>

          <p className="mt-2 text-xl font-semibold text-[#10201b]">
            {pendingReferrals}
          </p>
        </div>
      </section>

      {/* Activity */}
      <section className="overflow-hidden rounded-2xl border border-[#e1e9e5] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#edf1ef] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#10201b]">
              Referral activity
            </h2>

            <p className="mt-0.5 text-xs text-[#8a9993]">
              Your recent referral activity.
            </p>
          </div>

          <span className="text-xs text-[#8a9993]">
            {totalReferrals}{" "}
            {totalReferrals === 1 ? "referral" : "referrals"}
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto h-7 w-7 text-[#9aa6a1]" />

            <p className="mt-3 text-sm font-semibold text-[#10201b]">
              No referrals yet
            </p>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#8a9993]">
              When someone registers using your referral link,
              their activity will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#edf1ef]">
            {referrals.map((referral) => {
              const displayName =
                referral.referredUser.fullName ||
                referral.referredUser.email ||
                referral.referredUser.phone ||
                "MooGold user";

              const reward =
                referral.rewardAmount !== null
                  ? formatMoney(
                      Number(referral.rewardAmount),
                      referral.rewardCurrency || "USD",
                    )
                  : "—";

              const date = new Intl.DateTimeFormat(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              ).format(referral.createdAt);

              return (
                <div
                  key={referral.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef5f1] text-xs font-semibold text-[#315c4d]">
                      {displayName
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#10201b]">
                        {displayName}
                      </p>

                      <p className="mt-0.5 text-xs text-[#8a9993]">
                        Joined {date}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-[#8a9993]">
                        Reward
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-[#10201b]">
                        {reward}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(
                        referral.status,
                      )}`}
                    >
                      {statusLabel(referral.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}