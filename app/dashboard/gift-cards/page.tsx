import Link from "next/link";
import {
  ArrowLeft,
  Gift,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import GiftCardSearch from "./gift-card-search";

export const dynamic = "force-dynamic";

export default async function GiftCardsPage() {
  const products = await prisma.giftCardProduct.findMany({
    where: {
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
    orderBy: [
      {
        brand: {
          name: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  });

  const searchProducts = products.map(
    (product) => {
      const values = product.denominations.map(
        (denomination) =>
          Number(denomination.value),
      );

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        currency: product.currency,
        logoUrl: product.brand.logoUrl,
        brandName: product.brand.name,
        minValue:
          values.length > 0
            ? Math.min(...values)
            : null,
        maxValue:
          values.length > 0
            ? Math.max(...values)
            : null,
      };
    },
  );

  return (
    <main className="min-h-full min-w-0 overflow-x-hidden bg-slate-50">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Wallet
          </Link>
        </div>

        <div className="mb-6 min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Gift className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Gift Cards
              </h1>

              <p className="text-sm text-slate-500">
                Choose a gift card to redeem.
              </p>
            </div>
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900">
            How it works
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Select your gift card, provide the
            requested card information for review.
            Your wallet gets credited in seconds.
          </p>
        </section>

        {products.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Gift className="h-5 w-5" />
            </div>

            <h2 className="mt-3 text-base font-semibold text-slate-900">
              No gift cards available
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please check again later.
            </p>
          </section>
        ) : (
          <GiftCardSearch
            products={searchProducts}
          />
        )}
      </div>
    </main>
  );
}