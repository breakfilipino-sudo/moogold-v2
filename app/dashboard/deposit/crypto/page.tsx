import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";
import { prisma } from "@/lib/prisma";

import WalletCryptoDepositForm from "./wallet-crypto-deposit-form";

export default async function WalletCryptoDepositPage() {
  const { user } = await getCurrentUser();
  const country = getCountryFinancialConfig(user.countryCode);
  const now = new Date();

  const [activeRequest, recentRequests] = await Promise.all([
    prisma.walletCryptoDeposit.findFirst({
      where: {
        userId: user.id,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        reference: true,
        asset: true,
        network: true,
        receivingAddress: true,
        memo: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.walletCryptoDeposit.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        reference: true,
        asset: true,
        network: true,
        status: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  if (!country) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h1 className="text-lg font-semibold text-amber-900">
          Wallet Crypto funding unavailable
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Your registered country does not have a supported wallet currency.
          Please contact support.
        </p>
      </div>
    );
  }

  const initialRequest = activeRequest
    ? {
        ...activeRequest,
        expiresAt: activeRequest.expiresAt.toISOString(),
      }
    : null;

  return (
    <div className="space-y-6">
      <WalletCryptoDepositForm initialRequest={initialRequest} />

      {recentRequests.length > 0 && (
        <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent wallet Crypto requests
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRequests.map((request) => {
              const isExpired =
                request.status === "PENDING" &&
                request.expiresAt.getTime() <= now.getTime();

              const status = isExpired ? "Expired" : request.status === "COMPLETED"
                ? "Completed"
                : request.status === "REJECTED"
                  ? "Rejected"
                  : "Pending";

              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {request.asset}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {request.reference} · {request.network}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {request.createdAt.toLocaleString("en-US")}
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      status === "Completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : status === "Rejected" || status === "Expired"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}