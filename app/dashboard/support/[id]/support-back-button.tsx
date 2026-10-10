"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupportBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        router.push("/dashboard/support")
      }
      className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </button>
  );
}