import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

function formatAmount(amount: unknown, currencyValue: string | null | undefined) {
  const currency =
    currencyValue && /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function readableValue(value: unknown) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function TransactionsPage() {
  const { user } = await getCurrentUser();

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/dashboard/wallet"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to wallet
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <History className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Wallet activity
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your recent wallet transactions.
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {transactions.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <History className="mx-auto size-8 text-muted-foreground/60" />
            <h2 className="mt-4 font-medium">No activity yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your wallet transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((transaction) => {
              const status = String(transaction.status).toUpperCase();
              const statusClass =
                status === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : status === "PENDING"
                    ? "bg-amber-500/10 text-amber-600"
                    : status === "FAILED" || status === "REJECTED"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-muted text-muted-foreground";

              return (
                <article
                  key={transaction.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {readableValue(transaction.type)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(transaction.createdAt)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                    >
                      {readableValue(status)}
                    </span>
                  </div>

                  <p className="shrink-0 font-semibold tabular-nums">
                    {formatAmount(transaction.amount, transaction.currency)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}