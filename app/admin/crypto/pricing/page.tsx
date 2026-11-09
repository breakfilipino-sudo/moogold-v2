import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import CryptoPricingForm from "./pricing-form";

export default async function AdminCryptoPricingPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { id: true, role: true },
  });

  if (!admin || admin.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Administrator access required
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          You are not authorized to manage crypto pricing.
        </p>
      </div>
    );
  }

  const settings = await prisma.cryptoTradingSettings.findUnique({
    where: { id: "default" },
    select: {
      sellPremiumPercent: true,
      updatedAt: true,
    },
  });

  const currentPremium = settings?.sellPremiumPercent.toString() ?? "50";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <Link
          href="/admin/crypto"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Back to Crypto
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Crypto Pricing
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage the premium applied to customer crypto Sell quotes.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Sell premium
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          The premium is applied to the verified crypto market value converted
          into the customer&apos;s wallet currency. The customer sees the final
          Sell amount before confirming.
        </p>

        <div className="my-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Current saved premium
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {currentPremium}%
          </p>
        </div>

        <CryptoPricingForm
          currentPremium={currentPremium}
        />

        <p className="mt-5 text-xs text-slate-400">
          Last updated: {settings ? settings.updatedAt.toLocaleString("en-US") : "Not saved yet"}
        </p>
      </section>
    </div>
  );
}
