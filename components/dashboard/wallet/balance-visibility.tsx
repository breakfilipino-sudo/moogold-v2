"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  balance: string;
};

export default function BalanceVisibility({
  balance,
}: Props) {
  const [visible, setVisible] = useState(true);

  const hiddenValue = "\u2022\u2022\u2022\u2022\u2022\u2022";

  return (
    <div>
      <div className="flex items-center gap-3">
        <p
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          aria-label={visible ? "Available balance" : "Balance hidden"}
        >
          {visible ? balance : hiddenValue}
        </p>

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide balance" : "Show balance"}
          aria-pressed={!visible}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          {visible ? (
            <Eye className="h-5 w-5" />
          ) : (
            <EyeOff className="h-5 w-5" />
          )}
        </button>
      </div>

    </div>
  );
}
