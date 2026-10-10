"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Globe2,
  Hash,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { submitGiftCardRedemption } from "../actions";

type Denomination = {
  id: string;
  value: number;
  creditAmount: number | null;
};

type GiftCardProduct = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  countryCode: string | null;
  region: string | null;
  requiresCountry: boolean;
  inputMode: string;
  maxCardsPerSubmission: number;
  redemptionMethod: string;
  redemptionValue: number;
};

type Props = {
  product: GiftCardProduct;
  brand: {
    name: string;
  };
  denominations: Denomination[];
  localCurrency: string | null;
  localCurrencySymbol: string | null;
};

type PhotoState = {
  file: File | null;
  previewUrl: string | null;
};

function formatCurrency(
  value: number,
  currency: string,
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatLocalCurrency(
  value: number,
  currency: string,
  symbol: string | null,
) {
  const formatted = Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  return symbol
    ? `${symbol}${formatted} ${currency}`
    : `${formatted} ${currency}`;
}

function getCreditAmount(
  denomination: Denomination,
  product: GiftCardProduct,
) {
  if (denomination.creditAmount !== null) {
    return denomination.creditAmount;
  }

  if (
    product.redemptionMethod ===
    "PERCENTAGE"
  ) {
    return (
      denomination.value *
      (product.redemptionValue / 100)
    );
  }

  return Math.max(
    0,
    denomination.value -
      product.redemptionValue,
  );
}

export default function GiftCardRedemptionForm({
  product,
  brand,
  denominations,
  localCurrency,
  localCurrencySymbol,
}: Props) {
  const firstDenomination =
    denominations[0];

  const [denominationId, setDenominationId] =
    useState(firstDenomination?.id ?? "");

  const [quantity, setQuantity] =
    useState(1);

  const [countryCode, setCountryCode] =
    useState(product.countryCode ?? "");

  const [description, setDescription] =
    useState("");

  const [codes, setCodes] = useState<
    Record<number, string>
  >({});

  const [photos, setPhotos] = useState<
    Record<number, PhotoState>
  >({});

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [
    localRate,
    setLocalRate,
  ] = useState<number | null>(null);

  const [
    isLoadingRate,
    setIsLoadingRate,
  ] = useState(false);

  const [isPending, startTransition] =
    useTransition();

  const formRef =
    useRef<HTMLFormElement>(null);

  const selectedDenomination =
    denominations.find(
      (item) =>
        item.id === denominationId,
    ) ?? firstDenomination;

  const creditPerCard =
    selectedDenomination
      ? getCreditAmount(
          selectedDenomination,
          product,
        )
      : 0;

  const totalFaceValue =
    (selectedDenomination?.value ?? 0) *
    quantity;

  const totalCreditAmount =
    creditPerCard * quantity;

  const hasLocalCurrency =
    Boolean(
      localCurrency &&
        localCurrencySymbol,
    );

  useEffect(() => {
    let cancelled = false;

    async function loadRate() {
      if (
        !localCurrency ||
        !product.currency
      ) {
        setLocalRate(null);
        return;
      }

      if (
        localCurrency === product.currency
      ) {
        setLocalRate(1);
        return;
      }

      setIsLoadingRate(true);

      try {
        const response =
          await fetch(
            `/api/currency-rate?from=${encodeURIComponent(
              product.currency,
            )}&to=${encodeURIComponent(
              localCurrency,
            )}`,
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            "Unable to retrieve rate.",
          );
        }

        const data =
          await response.json();

        const rate = Number(data?.rate);

        if (
          !Number.isFinite(rate) ||
          rate <= 0
        ) {
          throw new Error(
            "Invalid exchange rate.",
          );
        }

        if (!cancelled) {
          setLocalRate(rate);
        }
      } catch {
        if (!cancelled) {
          setLocalRate(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRate(false);
        }
      }
    }

    void loadRate();

    return () => {
      cancelled = true;
    };
  }, [
    localCurrency,
    product.currency,
  ]);

  const localTotalFaceValue =
    localRate !== null
      ? totalFaceValue * localRate
      : null;

  const localTotalCreditAmount =
    localRate !== null
      ? totalCreditAmount * localRate
      : null;

  /*
   * Input mode semantics:
   *
   * PHOTO = photo required
   * CODE  = code required
   * BOTH  = code OR photo required
   */
  const requiresCode =
    product.inputMode === "CODE";

  const requiresPhoto =
    product.inputMode === "PHOTO";

  const allowsCode =
    product.inputMode === "CODE" ||
    product.inputMode === "BOTH";

  const allowsPhoto =
    product.inputMode === "PHOTO" ||
    product.inputMode === "BOTH";

  const cardNumbers = useMemo(
    () =>
      Array.from(
        {
          length: quantity,
        },
        (_, index) => index + 1,
      ),
    [quantity],
  );

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1),
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(
        product.maxCardsPerSubmission,
        current + 1,
      ),
    );
  }

  function updateCode(
    sequence: number,
    value: string,
  ) {
    setCodes((current) => ({
      ...current,
      [sequence]: value,
    }));
  }

  function updatePhoto(
    sequence: number,
    file: File | null,
  ) {
    setPhotos((current) => {
      const previous =
        current[sequence];

      if (previous?.previewUrl) {
        URL.revokeObjectURL(
          previous.previewUrl,
        );
      }

      if (!file) {
        const next = {
          ...current,
        };

        delete next[sequence];

        return next;
      }

      return {
        ...current,
        [sequence]: {
          file,
          previewUrl:
            URL.createObjectURL(file),
        },
      };
    });
  }

  function clearPhoto(sequence: number) {
    updatePhoto(sequence, null);
  }

  function validateBeforeSubmit() {
    if (!selectedDenomination) {
      return "Please select a card value.";
    }

    if (
      quantity < 1 ||
      quantity >
        product.maxCardsPerSubmission
    ) {
      return `You can redeem between 1 and ${product.maxCardsPerSubmission} cards.`;
    }

    if (
      product.requiresCountry &&
      !countryCode
    ) {
      return "Please select the card country.";
    }

    for (const sequence of cardNumbers) {
      const code = (
        codes[sequence] ?? ""
      )
        .trim();

      const photo =
        photos[sequence]?.file;

      if (
        requiresPhoto &&
        !photo
      ) {
        return `Please upload a photo for card ${sequence}.`;
      }

      if (
        requiresCode &&
        !code
      ) {
        return `Please enter the code for card ${sequence}.`;
      }

      if (
        product.inputMode === "BOTH" &&
        !code &&
        !photo
      ) {
        return `Please enter the code or upload a photo for card ${sequence}.`;
      }

      if (photo) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(photo.type)
        ) {
          return `The photo for card ${sequence} must be JPEG, PNG, or WebP.`;
        }

        if (
          photo.size >
          10 * 1024 * 1024
        ) {
          return `The photo for card ${sequence} must be 10 MB or smaller.`;
        }
      }
    }

    const normalizedCodes =
      cardNumbers
        .map((sequence) =>
          (codes[sequence] ?? "")
            .trim()
            .replace(/\s+/g, "")
            .toUpperCase(),
        )
        .filter(Boolean);

    if (normalizedCodes.length > 1) {
      const uniqueCodes =
        new Set(normalizedCodes);

      if (
        uniqueCodes.size !==
        normalizedCodes.length
      ) {
        return "Each card must have a different code.";
      }
    }

    return null;
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const validationError =
      validateBeforeSubmit();

    if (validationError) {
      setError(validationError);
      return;
    }

    const formData = new FormData();

    formData.set(
      "productSlug",
      product.slug,
    );

    formData.set(
      "denomination",
      denominationId,
    );

    formData.set(
      "quantity",
      String(quantity),
    );

    if (countryCode) {
      formData.set(
        "countryCode",
        countryCode,
      );
    }

    if (description.trim()) {
      formData.set(
        "description",
        description.trim(),
      );
    }

    for (const sequence of cardNumbers) {
      const code = (
        codes[sequence] ?? ""
      ).trim();

      const photo =
        photos[sequence]?.file;

      if (
        allowsCode &&
        code
      ) {
        formData.set(
          `giftCardCode_${sequence}`,
          code,
        );
      }

      if (
        allowsPhoto &&
        photo
      ) {
        formData.set(
          `giftCardPhoto_${sequence}`,
          photo,
        );
      }
    }

    startTransition(async () => {
      const result =
        await submitGiftCardRedemption(
          formData,
        );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(
        "Your gift card has been sent. We will take care of the rest.",
      );

      setCodes({});

      Object.values(photos).forEach(
        (photo) => {
          if (photo.previewUrl) {
            URL.revokeObjectURL(
              photo.previewUrl,
            );
          }
        },
      );

      setPhotos({});
      setDescription("");

      formRef.current?.reset();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="min-w-0 space-y-5">
        {error && (
          <div
            role="alert"
            className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-800">
                Gift card received
              </p>

              <p className="mt-1 text-sm leading-5 text-emerald-700">
                {success}
              </p>
            </div>
          </div>
        )}

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-black text-slate-900">
              Choose your card
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the value and quantity.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label
                htmlFor="denomination"
                className="mb-2 block text-xs font-bold text-slate-600"
              >
                Card value
              </label>

              <div className="relative">
                <select
                  id="denomination"
                  value={denominationId}
                  onChange={(event) =>
                    setDenominationId(
                      event.target.value,
                    )
                  }
                  disabled={isPending}
                  className="h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                >
                  {denominations.length ===
                  0 ? (
                    <option value="">
                      No values available
                    </option>
                  ) : (
                    denominations.map(
                      (denomination) => (
                        <option
                          key={
                            denomination.id
                          }
                          value={
                            denomination.id
                          }
                        >
                          {formatCurrency(
                            denomination.value,
                            product.currency,
                          )}
                        </option>
                      ),
                    )
                  )}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="min-w-0">
              <label className="mb-2 block text-xs font-bold text-slate-600">
                Number of cards
              </label>

              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={
                    decreaseQuantity
                  }
                  disabled={
                    isPending ||
                    quantity <= 1
                  }
                  className="flex h-full w-11 shrink-0 items-center justify-center text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Decrease number of cards"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="flex min-w-0 flex-1 items-center justify-center border-x border-slate-200 text-sm font-black text-slate-900">
                  {quantity}
                </div>

                <button
                  type="button"
                  onClick={
                    increaseQuantity
                  }
                  disabled={
                    isPending ||
                    quantity >=
                      product.maxCardsPerSubmission
                  }
                  className="flex h-full w-11 shrink-0 items-center justify-center text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Increase number of cards"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {product.requiresCountry && (
              <div className="min-w-0 sm:col-span-2">
                <label
                  htmlFor="countryCode"
                  className="mb-2 block text-xs font-bold text-slate-600"
                >
                  Card country
                </label>

                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <select
                    id="countryCode"
                    value={countryCode}
                    onChange={(event) =>
                      setCountryCode(
                        event.target.value,
                      )
                    }
                    disabled={isPending}
                    className="h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                  >
                    <option value="">
                      Select country
                    </option>

                    {product.countryCode && (
                      <option
                        value={
                          product.countryCode
                        }
                      >
                        {product.countryCode}
                      </option>
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-black text-slate-900">
              Card information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add the information for each card.
            </p>
          </div>

          <div className="min-w-0 space-y-4">
            {cardNumbers.map(
              (sequence) => {
                const photo =
                  photos[sequence]?.file;

                const previewUrl =
                  photos[sequence]
                    ?.previewUrl;

                return (
                  <div
                    key={sequence}
                    className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-700">
                          {sequence}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            Card{" "}
                            {sequence}
                          </p>

                          <p className="truncate text-xs text-slate-400">
                            {formatCurrency(
                              selectedDenomination?.value ??
                                0,
                              product.currency,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {allowsCode && (
                      <div className="min-w-0">
                        <label
                          htmlFor={`giftCardCode_${sequence}`}
                          className="mb-2 block text-xs font-bold text-slate-600"
                        >
                          Gift card code
                          {product.inputMode ===
                            "BOTH" && (
                            <span className="ml-1 font-normal text-slate-400">
                              (optional if photo is provided)
                            </span>
                          )}
                        </label>

                        <div className="relative">
                          <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            id={`giftCardCode_${sequence}`}
                            type="text"
                            value={
                              codes[
                                sequence
                              ] ?? ""
                            }
                            onChange={(
                              event,
                            ) =>
                              updateCode(
                                sequence,
                                event
                                  .target
                                  .value,
                              )
                            }
                            disabled={
                              isPending
                            }
                            placeholder="Enter code"
                            autoComplete="off"
                            spellCheck={
                              false
                            }
                            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm font-semibold uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
                          />
                        </div>
                      </div>
                    )}

                    {allowsPhoto && (
                      <div
                        className={
                          allowsCode
                            ? "mt-4 min-w-0"
                            : "min-w-0"
                        }
                      >
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                          Gift card photo
                          {product.inputMode ===
                            "BOTH" && (
                            <span className="ml-1 font-normal text-slate-400">
                              (optional if code is provided)
                            </span>
                          )}
                        </label>

                        {!photo ? (
                          <label
                            htmlFor={`giftCardPhoto_${sequence}`}
                            className="group flex min-h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center transition hover:border-emerald-300 hover:bg-emerald-50/20"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-emerald-600 transition group-hover:bg-emerald-50">
                              {product.inputMode ===
                              "PHOTO" ? (
                                <Camera className="h-4 w-4" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </div>

                            <span className="mt-3 text-xs font-bold text-slate-700">
                              Add photo
                            </span>

                            <span className="mt-1 text-[11px] text-slate-400">
                              JPEG, PNG or WebP
                              {" - "}
                              max 10 MB
                            </span>

                            <input
                              id={`giftCardPhoto_${sequence}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              disabled={
                                isPending
                              }
                              onChange={(
                                event,
                              ) => {
                                const file =
                                  event
                                    .target
                                    .files?.[0] ??
                                  null;

                                updatePhoto(
                                  sequence,
                                  file,
                                );
                              }}
                              className="sr-only"
                            />
                          </label>
                        ) : (
                          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            {previewUrl && (
                              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={
                                    previewUrl
                                  }
                                  alt={`Gift card ${sequence}`}
                                  className="h-full w-full object-contain"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    clearPhoto(
                                      sequence,
                                    )
                                  }
                                  disabled={
                                    isPending
                                  }
                                  className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-50"
                                  aria-label={`Remove photo for card ${sequence}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}

                            <div className="flex min-w-0 items-center justify-between gap-3 p-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-700">
                                  {photo.name}
                                </p>

                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {(
                                    photo.size /
                                    (1024 *
                                      1024)
                                  ).toFixed(
                                    2,
                                  )}{" "}
                                  MB
                                </p>
                              </div>

                              <label
                                htmlFor={`giftCardPhoto_${sequence}`}
                                className="shrink-0 cursor-pointer rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200"
                              >
                                Change

                                <input
                                  id={`giftCardPhoto_${sequence}`}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  disabled={
                                    isPending
                                  }
                                  onChange={(
                                    event,
                                  ) => {
                                    const file =
                                      event
                                        .target
                                        .files?.[0] ??
                                      null;

                                    updatePhoto(
                                      sequence,
                                      file,
                                    );
                                  }}
                                  className="sr-only"
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label
            htmlFor="description"
            className="mb-2 block text-xs font-bold text-slate-600"
          >
            Note{" "}
            <span className="font-normal text-slate-400">
              (optional)
            </span>
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            disabled={isPending}
            rows={3}
            placeholder="Anything you'd like us to know?"
            className="w-full min-w-0 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"
          />
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <div className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="min-w-0 bg-[#0a1713] p-5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black">
                {brand.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {product.name}
                </p>

                <p className="mt-0.5 truncate text-xs text-white/45">
                  {brand.name}{" "}
                  {" - "}
                  {product.currency}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Card value
                </span>

                <span className="text-right text-sm font-bold text-slate-900">
                  {formatCurrency(
                    selectedDenomination?.value ??
                      0,
                    product.currency,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Cards
                </span>

                <span className="text-sm font-bold text-slate-900">
                  {quantity}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Total
                </span>

                <span className="text-right text-sm font-bold text-slate-900">
                  {formatCurrency(
                    totalFaceValue,
                    product.currency,
                  )}
                </span>
              </div>
            </div>

            {hasLocalCurrency &&
              localCurrency && (
                <>
                  <div className="my-5 border-t border-slate-100" />

                  <div className="rounded-2xl bg-slate-50 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-slate-500">
                        Local equivalent
                      </p>

                      {isLoadingRate && (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                      )}
                    </div>

                    {localTotalFaceValue !==
                    null ? (
                      <>
                        <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
                          ~{" "}
                          {formatLocalCurrency(
                            localTotalFaceValue,
                            localCurrency,
                            localCurrencySymbol,
                          )}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Based on the current
                          exchange rate
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        Exchange rate
                        unavailable
                      </p>
                    )}
                  </div>
                </>
              )}

            <div className="my-5 border-t border-slate-100" />

            <div>
              <p className="text-xs font-bold text-slate-400">
                You receive
              </p>

              <p className="mt-1 text-2xl font-black tracking-tight text-emerald-600">
                {formatCurrency(
                  totalCreditAmount,
                  product.currency,
                )}
              </p>

              {hasLocalCurrency &&
                localCurrency &&
                localTotalCreditAmount !==
                  null && (
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    ~{" "}
                    {formatLocalCurrency(
                      localTotalCreditAmount,
                      localCurrency,
                      localCurrencySymbol,
                    )}
                  </p>
                )}
            </div>

            <button
              type="submit"
              disabled={
                isPending ||
                denominations.length === 0
              }
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redeeming...
                </>
              ) : (
                "Redeem Gift Card"
              )}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}