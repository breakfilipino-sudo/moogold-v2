"use client";

import Image from "next/image";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type Props = {
  reference: string;
  method: string;
  initialStatus: string;
};

type GatewayResponse = {
  status?: string;
  gatewayUrl?: string | null;
};

export default function EwalletWaitingClient({
  reference,
  method,
  initialStatus,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [redirecting, setRedirecting] = useState(false);

  const isGcash = method === "GCASH";

  useEffect(() => {
    // Maya remains admin-managed until its customer-facing design is supplied.
    if (method === "MAYA" || initialStatus !== "PENDING" || redirecting) return;

    let active = true;

    async function checkGateway() {
      try {
        const response = await fetch(
          `/api/dashboard/deposit-request/${encodeURIComponent(reference)}`,
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const data = (await response.json()) as GatewayResponse;

        if (!active) return;

        if (data.status) setStatus(data.status);

        if (data.status !== "PENDING") {
          clearInterval(timer);
          return;
        }

        if (data.gatewayUrl) {
          setRedirecting(true);
          active = false;
          clearInterval(timer);
          window.location.assign(data.gatewayUrl);
        }
      } catch {
        // Keep waiting; the next check will retry.
      }
    }

    const timer = setInterval(() => {
      void checkGateway();
    }, 3000);

    void checkGateway();

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [reference, method, initialStatus, redirecting]);

  if (isGcash && status === "COMPLETED") {
    return (
      <div
        className="mt-8 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm"
        aria-live="polite"
      >
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <p className="mt-4 text-lg font-bold text-slate-900">
          Deposit completed
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Your deposit has been completed successfully.
        </p>
      </div>
    );
  }

  if (isGcash && status === "REJECTED") {
    return (
      <div
        className="mt-8 rounded-3xl border border-red-100 bg-white p-6 shadow-sm"
        aria-live="polite"
      >
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-4 text-lg font-bold text-slate-900">
          Deposit not completed
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Your deposit request was rejected.
        </p>
      </div>
    );
  }

  if (status === "COMPLETED") {
    return (
      <p className="mt-8 text-sm font-semibold text-emerald-700" aria-live="polite">
        Deposit completed.
      </p>
    );
  }

  if (status === "REJECTED") {
    return (
      <p className="mt-8 text-sm font-semibold text-red-600" aria-live="polite">
        Deposit request rejected.
      </p>
    );
  }

  if (isGcash) {
    return (
      <div
        className="mt-8 rounded-[28px] border border-[#DCEAFF] bg-white p-6 shadow-[0_16px_45px_rgba(15,74,135,0.08)]"
        aria-live="polite"
      >
        <div className="mx-auto flex h-16 items-center justify-center">
          <Image
            src="/images/gcash-symbol.svg"
            alt="GCash symbol"
            width={76}
            height={64}
            priority
            className="h-14 w-auto object-contain"
          />
        </div>

        <p className="mt-5 text-xl font-extrabold tracking-tight text-[#073B78]">
          {redirecting ? "Opening secure payment" : "Connecting to GCash"}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Preparing your secure cash-in.
        </p>

        <div className="mt-7 flex items-center justify-center gap-3 rounded-2xl bg-[#F0F6FF] px-4 py-4">
          <LoaderCircle
            className="h-5 w-5 animate-spin text-[#0064D2]"
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-[#15569B]">
            {redirecting ? "Opening payment..." : "Please wait"}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
          <ShieldCheck className="h-4 w-4 text-[#0064D2]" />
          Secure payment connection
        </div>
      </div>
    );
  }

  const provider =
    method === "TOUCH_N_GO" ? "Touch 'n Go" : "Maya";

  return (
    <div className="mt-10 flex flex-col items-center" aria-live="polite">
      <LoaderCircle
        className="h-12 w-12 animate-spin text-emerald-500"
        strokeWidth={2}
        aria-hidden="true"
      />

      <p className="mt-6 text-base font-semibold text-slate-900">
        {`Connecting to ${provider} for a safe deposit`}
      </p>

      <p className="mt-2 text-sm text-slate-500">Please wait...</p>
    </div>
  );
}