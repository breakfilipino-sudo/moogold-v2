"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type CryptoAsset = {
  asset: string;
  network: string;
  networkLabel: string;
  balance: string;
  usdValue: number | null;
  logo: string | null;
};

type Props = {
  assets: CryptoAsset[];
  totalUsd: number;
};

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getAssetKey(asset: CryptoAsset) {
  return `${asset.asset}:${asset.network}`;
}

export default function CryptoBalanceSelector({ assets, totalUsd }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAsset =
    assets.find((asset) => getAssetKey(asset) === selectedKey) ?? null;

  const displayedValue =
    selectedAsset === null
      ? formatUsd(totalUsd)
      : selectedAsset.usdValue === null
        ? "Price unavailable"
        : formatUsd(selectedAsset.usdValue);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative flex min-h-[120px] items-start gap-4 overflow-visible rounded-2xl bg-gradient-to-br from-[#0B241B] via-[#103D2B] to-[#176344] px-4 py-5 sm:min-h-[135px] sm:px-7 sm:py-6">
        <div className="min-w-0 flex-1 self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
            Total crypto value
          </p>

          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="break-all text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
              {displayedValue}
            </p>

            <div className="relative shrink-0 pb-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-label="Choose crypto balance"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            {selectedAsset?.asset ?? "All Crypto"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isOpen && (
            <div
              role="listbox"
              aria-label="Select cryptocurrency"
              className="absolute top-full right-0 z-50 mt-2 max-h-64 min-w-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
            >
              <button
                type="button"
                role="option"
                aria-selected={selectedKey === null}
                onClick={() => {
                  setSelectedKey(null);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold ${
                  selectedKey === null
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Crypto
                {selectedKey === null && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>

              {assets.map((asset) => {
                const key = getAssetKey(asset);
                const isSelected = selectedKey === key;

                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedKey(key);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {asset.asset}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
            </div>
          </div>

          {selectedAsset && (
            <p className="mt-2 text-xs font-medium text-emerald-100/80">
              {selectedAsset.networkLabel}
            </p>
          )}

        </div>
      </div>
    </section>
  );
}