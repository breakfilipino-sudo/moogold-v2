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
  AlertCircle,
} from "lucide-react";
import {
  getGiftCardRedemptionStatus,
  submitGiftCardRedemption,
} from "../actions";

type Denomination = { id: string; value: number; creditAmount: number | null };
type GiftCardProduct = {
  id: string; slug: string; name: string; currency: string;
  countryCode: string | null; region: string | null; requiresCountry: boolean;
  inputMode: string; maxCardsPerSubmission: number; redemptionMethod: string;
  redemptionValue: number;
};
type Props = {
  product: GiftCardProduct;
  brand: { name: string };
  denominations: Denomination[];
  localCurrency: string | null;
  localCurrencySymbol: string | null;
};
type PhotoState = { file: File | null; previewUrl: string | null };
type SubmissionState = "idle" | "processing" | "approved" | "rejected";

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(value);
  } catch { return `${currency} ${value.toFixed(2)}`; }
}
function formatLocalCurrency(value: number, currency: string, symbol: string | null) {
  const formatted = Number.isFinite(value)
    ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
  return symbol ? `${symbol}${formatted} ${currency}` : `${formatted} ${currency}`;
}
function getCreditAmount(denomination: Denomination, product: GiftCardProduct) {
  if (denomination.creditAmount !== null) return denomination.creditAmount;
  if (product.redemptionMethod === "PERCENTAGE") return denomination.value * (product.redemptionValue / 100);
  return Math.max(0, denomination.value - product.redemptionValue);
}

export default function GiftCardRedemptionForm({ product, brand, denominations, localCurrency, localCurrencySymbol }: Props) {
  const firstDenomination = denominations[0];
  const [denominationId, setDenominationId] = useState(firstDenomination?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [countryCode, setCountryCode] = useState(product.countryCode ?? "");
  const [description, setDescription] = useState("");
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<Record<number, PhotoState>>({});
  const [error, setError] = useState<string | null>(null);
  const [localRate, setLocalRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [hasInteracted, setHasInteracted] = useState(false);
  const [confirmationDismissed, setConfirmationDismissed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef(false);

  const selectedDenomination = denominations.find((item) => item.id === denominationId) ?? firstDenomination;
  const creditPerCard = selectedDenomination ? getCreditAmount(selectedDenomination, product) : 0;
  const totalFaceValue = (selectedDenomination?.value ?? 0) * quantity;
  const totalCreditAmount = creditPerCard * quantity;
  const hasLocalCurrency = Boolean(localCurrency && localCurrencySymbol);
  const requiresCode = product.inputMode === "CODE";
  const requiresPhoto = product.inputMode === "PHOTO";
  const allowsCode = product.inputMode === "CODE" || product.inputMode === "BOTH";
  const allowsPhoto = product.inputMode === "PHOTO" || product.inputMode === "BOTH";
  const cardNumbers = useMemo(() => Array.from({ length: quantity }, (_, index) => index + 1), [quantity]);
  const localTotalFaceValue = localRate !== null ? totalFaceValue * localRate : null;
  const localTotalCreditAmount = localRate !== null ? totalCreditAmount * localRate : null;
  const validWithoutSubmission = !validateBeforeSubmitSafe();

  function validateBeforeSubmitSafe() {
    if (!selectedDenomination) return "Please select a card value.";
    if (quantity < 1 || quantity > product.maxCardsPerSubmission) return `You can redeem between 1 and ${product.maxCardsPerSubmission} cards.`;
    if (product.requiresCountry && !countryCode) return "Please select the card country.";
    for (const sequence of cardNumbers) {
      const code = (codes[sequence] ?? "").trim();
      const photo = photos[sequence]?.file;
      if (requiresPhoto && !photo) return `Please upload a photo for card ${sequence}.`;
      if (requiresCode && !code) return `Please enter the code for card ${sequence}.`;
      if (product.inputMode === "BOTH" && !code && !photo) return `Please enter the code or upload a photo for card ${sequence}.`;
      if (photo) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return `The photo for card ${sequence} must be JPEG, PNG, or WebP.`;
        if (photo.size > 10 * 1024 * 1024) return `The photo for card ${sequence} must be 10 MB or smaller.`;
      }
    }
    const normalizedCodes = cardNumbers.map((sequence) => (codes[sequence] ?? "").trim().replace(/\s+/g, "").toUpperCase()).filter(Boolean);
    if (normalizedCodes.length > 1 && new Set(normalizedCodes).size !== normalizedCodes.length) return "Each card must have a different code.";
    return null;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadRate() {
      if (!localCurrency || !product.currency) { setLocalRate(null); return; }
      if (localCurrency === product.currency) { setLocalRate(1); return; }
      setIsLoadingRate(true);
      try {
        const response = await fetch(`/api/currency-rate?from=${encodeURIComponent(product.currency)}&to=${encodeURIComponent(localCurrency)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to retrieve rate.");
        const data = await response.json();
        const rate = Number(data?.rate);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid exchange rate.");
        if (!cancelled) setLocalRate(rate);
      } catch { if (!cancelled) setLocalRate(null); }
      finally { if (!cancelled) setIsLoadingRate(false); }
    }
    void loadRate();
    return () => { cancelled = true; };
  }, [localCurrency, product.currency]);

  useEffect(() => {
    if (error) {
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }, [error]);

  useEffect(() => {
    if (!hasInteracted || !validWithoutSubmission || confirmationDismissed || submissionState !== "idle" || isPending) {
      return;
    }

    // Defer the UI update until the next animation frame to avoid a synchronous
    // state update inside the effect while still opening as soon as the form is valid.
    const frame = requestAnimationFrame(() => setShowConfirmation(true));
    return () => cancelAnimationFrame(frame);
  }, [hasInteracted, validWithoutSubmission, confirmationDismissed, submissionState, isPending]);

  useEffect(() => {
    if (submissionState !== "processing" || !submissionId) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (cancelled || pollingRef.current) return;
      pollingRef.current = true;
      try {
        const result = await getGiftCardRedemptionStatus(submissionId);
        if (cancelled) return;
        if (result.success && result.status === "APPROVED") {
          setSubmissionState("approved");
          setShowConfirmation(true);
          return;
        }
        if (result.success && result.status === "REJECTED") {
          setRejectionReason(result.rejectionReason || "No rejection reason was provided.");
          setSubmissionState("rejected");
          setShowConfirmation(true);
          return;
        }
      } catch {
        // Keep showing processing and retry; do not infer approval from a polling error.
      } finally {
        pollingRef.current = false;
      }
      if (!cancelled) timeout = setTimeout(poll, 2500);
    };
    void poll();
    return () => { cancelled = true; if (timeout) clearTimeout(timeout); pollingRef.current = false; };
  }, [submissionState, submissionId]);

  function markInteraction() {
    setHasInteracted(true);
    setConfirmationDismissed(false);
    setError(null);
  }
  function decreaseQuantity() { markInteraction(); setQuantity((current) => Math.max(1, current - 1)); }
  function increaseQuantity() { markInteraction(); setQuantity((current) => Math.min(product.maxCardsPerSubmission, current + 1)); }
  function updateCode(sequence: number, value: string) { markInteraction(); setCodes((current) => ({ ...current, [sequence]: value })); }
  function updatePhoto(sequence: number, file: File | null) {
    markInteraction();
    setPhotos((current) => {
      const previous = current[sequence];
      if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
      if (!file) { const next = { ...current }; delete next[sequence]; return next; }
      return { ...current, [sequence]: { file, previewUrl: URL.createObjectURL(file) } };
    });
  }
  function clearPhoto(sequence: number) { updatePhoto(sequence, null); }

  function buildFormData() {
    const formData = new FormData();
    formData.set("productSlug", product.slug);
    formData.set("denomination", denominationId);
    formData.set("quantity", String(quantity));
    if (countryCode) formData.set("countryCode", countryCode);
    if (description.trim()) formData.set("description", description.trim());
    for (const sequence of cardNumbers) {
      const code = (codes[sequence] ?? "").trim();
      const photo = photos[sequence]?.file;
      if (allowsCode && code) formData.set(`giftCardCode_${sequence}`, code);
      if (allowsPhoto && photo) formData.set(`giftCardPhoto_${sequence}`, photo);
    }
    return formData;
  }

  function clearLocalForm() {
    setCodes({});
    Object.values(photos).forEach((photo) => { if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl); });
    setPhotos({});
    setDescription("");
    formRef.current?.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    markInteraction();
    const validationError = validateBeforeSubmitSafe();
    if (validationError) { setError(validationError); setShowConfirmation(false); return; }
    setShowConfirmation(true);
  }

  function confirmSubmission() {
    if (submissionState !== "idle" || isPending) return;
    const validationError = validateBeforeSubmitSafe();
    if (validationError) { setError(validationError); setShowConfirmation(false); return; }
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitGiftCardRedemption(buildFormData());
        if (!result.success) { setError(result.error); setShowConfirmation(false); return; }
        if (!result.submissionId) {
          setError("Your gift card was submitted, but we could not retrieve its status. Please check your redemption history before submitting again.");
          setShowConfirmation(false);
          return;
        }
        setSubmissionId(result.submissionId);
        setSubmissionState("processing");
        setShowConfirmation(true);
        setConfirmationDismissed(false);
        clearLocalForm();
      } catch {
        setError("We could not submit your gift card right now. Please try again.");
        setShowConfirmation(false);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        {error && <div ref={errorRef} role="alert" tabIndex={-1} className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        {submissionState === "approved" && !showConfirmation && <div role="status" className="flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div className="min-w-0"><p className="text-sm font-bold text-emerald-800">Gift card successfully processed.</p></div></div>}

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5"><h2 className="text-base font-black text-slate-900">Choose your card</h2><p className="mt-1 text-sm text-slate-500">Select the value and quantity.</p></div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0"><label htmlFor="denomination" className="mb-2 block text-xs font-bold text-slate-600">Card value</label><div className="relative"><select id="denomination" value={denominationId} onChange={(event) => { markInteraction(); setDenominationId(event.target.value); }} disabled={isPending || submissionState !== "idle"} className="h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60">{denominations.length === 0 ? <option value="">No values available</option> : denominations.map((denomination) => <option key={denomination.id} value={denomination.id}>{formatCurrency(denomination.value, product.currency)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></div>
            <div className="min-w-0"><label className="mb-2 block text-xs font-bold text-slate-600">Number of cards</label><div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50"><button type="button" onClick={decreaseQuantity} disabled={isPending || submissionState !== "idle" || quantity <= 1} className="flex h-full w-11 shrink-0 items-center justify-center text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Decrease number of cards"><Minus className="h-4 w-4" /></button><div className="flex min-w-0 flex-1 items-center justify-center border-x border-slate-200 text-sm font-black text-slate-900">{quantity}</div><button type="button" onClick={increaseQuantity} disabled={isPending || submissionState !== "idle" || quantity >= product.maxCardsPerSubmission} className="flex h-full w-11 shrink-0 items-center justify-center text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Increase number of cards"><Plus className="h-4 w-4" /></button></div></div>
            {product.requiresCountry && <div className="min-w-0 sm:col-span-2"><label htmlFor="countryCode" className="mb-2 block text-xs font-bold text-slate-600">Card country</label><div className="relative"><Globe2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><select id="countryCode" value={countryCode} onChange={(event) => { markInteraction(); setCountryCode(event.target.value); }} disabled={isPending || submissionState !== "idle"} className="h-11 w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60"><option value="">Select country</option>{product.countryCode && <option value={product.countryCode}>{product.countryCode}</option>}</select><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div></div>}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-base font-black text-slate-900">Card information</h2><p className="mt-1 text-sm text-slate-500">Add the information for each card.</p></div><div className="min-w-0 space-y-4">
          {cardNumbers.map((sequence) => {
            const photo = photos[sequence]?.file; const previewUrl = photos[sequence]?.previewUrl;
            return <div key={sequence} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-4 flex min-w-0 items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-black text-emerald-700">{sequence}</div><div className="min-w-0"><p className="text-sm font-bold text-slate-900">Card {sequence}</p><p className="truncate text-xs text-slate-400">{formatCurrency(selectedDenomination?.value ?? 0, product.currency)}</p></div></div></div>
              {allowsCode && <div className="min-w-0"><label htmlFor={`giftCardCode_${sequence}`} className="mb-2 block text-xs font-bold text-slate-600">Gift card code{product.inputMode === "BOTH" && <span className="ml-1 font-normal text-slate-400">(optional if photo is provided)</span>}</label><div className="relative"><Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id={`giftCardCode_${sequence}`} type="text" value={codes[sequence] ?? ""} onChange={(event) => updateCode(sequence, event.target.value)} disabled={isPending || submissionState !== "idle"} placeholder="Enter code" autoComplete="off" spellCheck={false} className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm font-semibold uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60" /></div></div>}
              {allowsPhoto && <div className={allowsCode ? "mt-4 min-w-0" : "min-w-0"}><label className="mb-2 block text-xs font-bold text-slate-600">Gift card photo{product.inputMode === "BOTH" && <span className="ml-1 font-normal text-slate-400">(optional if code is provided)</span>}</label>
                {!photo ? <label htmlFor={`giftCardPhoto_${sequence}`} className="group flex min-h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center transition hover:border-emerald-300 hover:bg-emerald-50/20"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-emerald-600 transition group-hover:bg-emerald-50">{product.inputMode === "PHOTO" ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}</div><span className="mt-3 text-xs font-bold text-slate-700">Add photo</span><span className="mt-1 text-[11px] text-slate-400">JPEG, PNG or WebP - max 10 MB</span><input id={`giftCardPhoto_${sequence}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={isPending || submissionState !== "idle"} onChange={(event) => updatePhoto(sequence, event.target.files?.[0] ?? null)} className="sr-only" /></label> : <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">{previewUrl && <div className="relative aspect-[16/9] overflow-hidden bg-slate-100"><img src={previewUrl} alt={`Gift card ${sequence}`} className="h-full w-full object-contain" /><button type="button" onClick={() => clearPhoto(sequence)} disabled={isPending || submissionState !== "idle"} className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition hover:bg-black/75 disabled:opacity-50" aria-label={`Remove photo for card ${sequence}`}><X className="h-4 w-4" /></button></div>}<div className="flex min-w-0 items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">{photo.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{(photo.size / (1024 * 1024)).toFixed(2)} MB</p></div><label htmlFor={`giftCardPhoto_${sequence}`} className="shrink-0 cursor-pointer rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-200">Change<input id={`giftCardPhoto_${sequence}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={isPending || submissionState !== "idle"} onChange={(event) => updatePhoto(sequence, event.target.files?.[0] ?? null)} className="sr-only" /></label></div></div>}
              </div>}
            </div>;
          })}
        </div></section>

        <section className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><label htmlFor="description" className="mb-2 block text-xs font-bold text-slate-600">Note <span className="font-normal text-slate-400">(optional)</span></label><textarea id="description" value={description} onChange={(event) => { markInteraction(); setDescription(event.target.value); }} disabled={isPending || submissionState !== "idle"} rows={3} placeholder="Anything you'd like us to know?" className="w-full min-w-0 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60" /></section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start"><div className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"><div className="min-w-0 bg-[#0a1713] p-5 text-white"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black">{brand.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-0.5 truncate text-xs text-white/45">{brand.name} - {product.currency}</p></div></div></div><div className="p-5"><div className="space-y-3.5"><div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Card value</span><span className="text-right text-sm font-bold text-slate-900">{formatCurrency(selectedDenomination?.value ?? 0, product.currency)}</span></div><div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Cards</span><span className="text-sm font-bold text-slate-900">{quantity}</span></div><div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Total</span><span className="text-right text-sm font-bold text-slate-900">{formatCurrency(totalFaceValue, product.currency)}</span></div></div>
          {hasLocalCurrency && localCurrency && <><div className="my-5 border-t border-slate-100" /><div className="rounded-2xl bg-slate-50 p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-slate-500">Estimated local value</p>{isLoadingRate && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />}</div>{localTotalFaceValue !== null ? <p className="mt-1 text-lg font-black tracking-tight text-slate-900">~ {formatLocalCurrency(localTotalFaceValue, localCurrency, localCurrencySymbol)}</p> : <p className="mt-1 text-sm font-semibold text-slate-400">Rate not available yet</p>}</div></>}
          <div className="my-5 border-t border-slate-100" /><div><p className="text-xs font-bold text-slate-400">You will receive</p>{hasLocalCurrency && localCurrency && localTotalCreditAmount !== null && <p className="mt-1 text-2xl font-black tracking-tight text-emerald-600">~ {formatLocalCurrency(localTotalCreditAmount, localCurrency, localCurrencySymbol)}</p>}<p className="mt-1 text-sm font-bold text-slate-500">{formatCurrency(totalCreditAmount, product.currency)}</p></div>
          <button type="submit" disabled={isPending || submissionState !== "idle" || denominations.length === 0} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : "Redeem Gift Card"}</button>
        </div></div></aside>

      {showConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="redemption-dialog-title" className="my-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {submissionState === "idle" ? <><div className="bg-[#0a1713] p-5 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Review redemption</p><h2 id="redemption-dialog-title" className="mt-1 text-lg font-black">Confirm gift card details</h2></div><button type="button" onClick={() => { setShowConfirmation(false); setConfirmationDismissed(true); }} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close confirmation"><X className="h-5 w-5" /></button></div></div><div className="space-y-4 p-5"><div><p className="font-bold text-slate-900">{product.name}</p><p className="mt-1 text-sm text-slate-500">{brand.name} - {product.currency}{countryCode ? " - " + countryCode : ""}</p></div><div className="space-y-3 rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Card value</span><span className="font-bold text-slate-900">{formatCurrency(selectedDenomination?.value ?? 0, product.currency)}</span></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Quantity</span><span className="font-bold text-slate-900">{quantity}</span></div><div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Total card value</span><span className="font-bold text-slate-900">{formatCurrency(totalFaceValue, product.currency)}</span></div><div className="border-t border-slate-200 pt-3"><p className="text-xs font-bold text-slate-500">You will receive</p>{hasLocalCurrency && localCurrency && localTotalCreditAmount !== null && <p className="mt-1 text-xl font-black text-emerald-700">~ {formatLocalCurrency(localTotalCreditAmount, localCurrency, localCurrencySymbol)}</p>}<p className="mt-1 text-sm font-bold text-slate-600">{formatCurrency(totalCreditAmount, product.currency)}</p>{hasLocalCurrency && localTotalCreditAmount === null && <p className="mt-1 text-xs text-slate-400">Local estimate is temporarily unavailable.</p>}</div></div><p className="text-xs leading-5 text-slate-500">Your redemption will be reviewed. Your wallet is credited only after the gift card is approved.</p><div className="flex gap-3"><button type="button" onClick={() => { setShowConfirmation(false); setConfirmationDismissed(true); }} className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Go back</button><button type="button" onClick={confirmSubmission} disabled={isPending} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting...</> : "Confirm redemption"}</button></div></div></> : submissionState === "processing" ? <div className="p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div><h2 id="redemption-dialog-title" className="mt-4 text-lg font-black text-slate-900">Gift card submitted</h2><p className="mt-2 text-sm leading-6 text-slate-600">Please wait, your gift card is being processed.</p><p className="mt-3 text-xs text-slate-400">This window will update when the review is complete. Please do not submit the same card again.</p></div> : submissionState === "approved" ? <div className="p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></div><h2 id="redemption-dialog-title" className="mt-4 text-lg font-black text-slate-900">Gift card successfully processed.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your redemption has been approved.</p><button type="button" onClick={() => setShowConfirmation(false)} className="mt-6 h-11 w-full rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">Close</button></div> : <div className="p-8 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50"><AlertCircle className="h-7 w-7 text-red-600" /></div><h2 id="redemption-dialog-title" className="mt-4 text-lg font-black text-slate-900">Redemption unsuccessful</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your gift card redemption was rejected.</p><div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-left"><p className="text-xs font-bold text-red-700">Reason provided</p><p className="mt-1 break-words text-sm text-red-800">{rejectionReason || "No rejection reason was provided."}</p></div><button type="button" onClick={() => setShowConfirmation(false)} className="mt-6 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button></div>}
      </div></div>}
    </form>
  );
}
