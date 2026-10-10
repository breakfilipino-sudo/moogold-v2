import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Gift,
  ShieldCheck,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getCountryFinancialConfig,
} from "@/lib/countries";
import GiftCardRedemptionForm from "./redemption-form";

type GiftCardPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getInputModeLabel(
  inputMode: string,
) {
  switch (inputMode) {
    case "PHOTO":
      return "Photo required";
    case "CODE":
      return "Code required";
    default:
      return "Photo or code";
  }
}

export default async function GiftCardRedemptionPage({
  params,
}: GiftCardPageProps) {
  const { slug } = await params;

  const [{ user }, product] =
    await Promise.all([
      getCurrentUser(),
      prisma.giftCardProduct.findFirst({
        where: {
          slug,
          active: true,
          brand: {
            active: true,
          },
        },
        include: {
          brand: true,
          denominations: {
            where: {
              active: true,
            },
            orderBy: {
              value: "asc",
            },
          },
        },
      }),
    ]);

  if (!product) {
    notFound();
  }

  const localCurrencyConfig =
    getCountryFinancialConfig(
      user.countryCode,
    );

  const denominations =
    product.denominations.map(
      (denomination) => ({
        id: denomination.id,
        value: Number(
          denomination.value,
        ),
        creditAmount:
          denomination.creditAmount !== null
            ? Number(
                denomination.creditAmount,
              )
            : null,
      }),
    );

  return (
    <main className="min-w-0 overflow-x-hidden">
      <div className="space-y-6 pb-8 lg:space-y-8">
        <section className="relative min-w-0 overflow-hidden rounded-[30px] bg-[#0a1713] p-5 text-white shadow-2xl shadow-emerald-950/10 sm:p-8 lg:p-10">
          <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative min-w-0">
            <Link
              href="/dashboard/gift-cards"
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/50 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Gift Cards
            </Link>

            <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 max-w-2xl">
                <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  <Gift className="h-3.5 w-3.5 shrink-0" />
                  Gift card redemption
                </div>

                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg sm:h-16 sm:w-16">
                    {product.brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          product.brand.logoUrl
                        }
                        alt={`${product.brand.name} logo`}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Gift className="h-7 w-7 text-emerald-600" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-[0.15em] text-white/40">
                      {product.brand.name}
                    </p>

                    <h1 className="mt-1 break-words text-2xl font-black tracking-[-0.03em] sm:text-3xl lg:text-4xl">
                      {product.name}
                    </h1>
                  </div>
                </div>

                {product.brand.description && (
                  <p className="mt-5 max-w-xl text-sm leading-6 text-white/45">
                    {product.brand.description}
                  </p>
                )}
              </div>

              <div className="flex w-fit max-w-full shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="truncate">
                  {getInputModeLabel(
                    product.inputMode,
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        <GiftCardRedemptionForm
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            currency: product.currency,
            countryCode:
              product.countryCode,
            region: product.region,
            requiresCountry:
              product.requiresCountry,
            inputMode: product.inputMode,
            maxCardsPerSubmission:
              product.maxCardsPerSubmission,
            redemptionMethod:
              product.redemptionMethod,
            redemptionValue: Number(
              product.redemptionValue,
            ),
          }}
          brand={{
            name: product.brand.name,
          }}
          denominations={denominations}
          localCurrency={
            localCurrencyConfig?.currency ??
            null
          }
          localCurrencySymbol={
            localCurrencyConfig?.currencySymbol ??
            null
          }
        />
      </div>
    </main>
  );
}