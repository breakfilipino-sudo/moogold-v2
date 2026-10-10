"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type GiftCardProduct = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  logoUrl: string | null;
  brandName: string;
  minValue: number | null;
  maxValue: number | null;
};

type Props = {
  products: GiftCardProduct[];
};

const BRAND_LOGOS: Record<string, string> = {
  Apple: "https://cdn.simpleicons.org/apple",
  Amazon: "https://cdn.simpleicons.org/amazon",
  Steam: "https://cdn.simpleicons.org/steam",
  "Google Play": "https://cdn.simpleicons.org/googleplay",
  PlayStation: "https://cdn.simpleicons.org/playstation",
  Xbox: "https://cdn.simpleicons.org/xbox",
  "Razer Gold": "https://cdn.simpleicons.org/razer",
  Netflix: "https://cdn.simpleicons.org/netflix",
  Sephora: "https://cdn.simpleicons.org/sephora",
  "Vanilla Visa Prepaid":
    "https://cdn.simpleicons.org/visa",
  "Vanilla Mastercard Prepaid":
    "https://cdn.simpleicons.org/mastercard",
  "American Express":
    "https://cdn.simpleicons.org/americanexpress",
  "CVS Pharmacy":
    "https://cdn.simpleicons.org/cvs",
  Walgreens:
    "https://cdn.simpleicons.org/walgreens",
  Hulu:
    "https://cdn.simpleicons.org/hulu",
  Walmart:
    "https://cdn.simpleicons.org/walmart",
  Target:
    "https://cdn.simpleicons.org/target",
  "Best Buy":
    "https://cdn.simpleicons.org/bestbuy",
  eBay:
    "https://cdn.simpleicons.org/ebay",
  Nordstrom:
    "https://cdn.simpleicons.org/nordstrom",
  GameStop:
    "https://cdn.simpleicons.org/gamestop",
  IKEA:
    "https://cdn.simpleicons.org/ikea",
  "The Home Depot":
    "https://cdn.simpleicons.org/homedepot",
  Airbnb:
    "https://cdn.simpleicons.org/airbnb",
  "American Airlines":
    "https://cdn.simpleicons.org/americanairlines",
  "Visa Gift Card":
    "https://cdn.simpleicons.org/visa",
};

function formatCurrency(
  value: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function GiftCardLogo({
  logoUrl,
  brandName,
}: {
  logoUrl: string | null;
  brandName: string;
}) {
  const brandLogo =
    BRAND_LOGOS[brandName] ?? null;

  const [source, setSource] =
    useState<string>(
      logoUrl ?? brandLogo ?? "",
    );

  const [showFallback, setShowFallback] =
    useState(false);

  const handleError = () => {
    if (
      brandLogo &&
      source !== brandLogo
    ) {
      setSource(brandLogo);
      return;
    }

    setShowFallback(true);
  };

  if (source && !showFallback) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt={`${brandName} gift card`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleError}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50 px-2">
      <div className="text-center text-xs font-bold text-slate-600">
        {brandName}
      </div>
    </div>
  );
}

export default function GiftCardSearch({
  products,
}: Props) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalized = query
      .trim()
      .toLowerCase();

    if (!normalized) {
      return products;
    }

    return products.filter((product) =>
      `${product.name} ${product.brandName} ${product.currency}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [products, query]);

  return (
    <div className="min-w-0 space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search gift cards..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          aria-label="Search gift cards"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear gift card search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            No gift cards found
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Try another brand or gift card name.
          </p>
        </section>
      ) : (
        <section className="grid min-w-0 gap-3">
          {filteredProducts.map(
            (product) => (
              <Link
                key={product.id}
                href={`/dashboard/gift-cards/${product.slug}`}
                className="group flex min-w-0 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden bg-slate-50 sm:h-26 sm:w-24">
                  <GiftCardLogo
                    logoUrl={product.logoUrl}
                    brandName={
                      product.brandName
                    }
                  />
                </div>

                <div className="flex min-w-0 flex-1 items-center px-3 py-3 sm:px-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {product.name}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {product.currency}

                      {product.minValue !==
                        null &&
                        product.maxValue !==
                          null && (
                          <>
                            {" - "}
                            {formatCurrency(
                              product.minValue,
                              product.currency,
                            )}
                            {" - "}
                            {formatCurrency(
                              product.maxValue,
                              product.currency,
                            )}
                          </>
                        )}
                    </p>
                  </div>
                </div>
              </Link>
            ),
          )}
        </section>
      )}
    </div>
  );
}