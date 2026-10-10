"use client";

import { useState } from "react";

type CashOutButtonProps = {
  maturityDate: Date;
  isMatured: boolean;
};

function formatMaturityDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function CashOutButton({
  maturityDate,
}: CashOutButtonProps) {
  const [showMessage, setShowMessage] =
    useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMessage(true)}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-[#cbdad3] bg-white px-4 text-xs font-extrabold text-[#10201b] transition hover:border-emerald-400 hover:bg-emerald-50"
      >
        Cash out
      </button>

      {showMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-sm rounded-[22px] border border-[#d7e3dd] bg-white p-6 shadow-2xl">
            <p className="text-lg font-extrabold text-[#10201b]">
              Cash out
            </p>

            <p className="mt-4 text-sm font-semibold leading-6 text-[#52655c]">
              You can withdraw your money on{" "}
              <span className="font-extrabold text-[#10201b]">
                {formatMaturityDate(
                  maturityDate,
                )}
              </span>
              .
            </p>

            <button
              type="button"
              onClick={() =>
                setShowMessage(false)
              }
              className="mt-5 h-10 w-full rounded-lg bg-[#10201b] px-4 text-xs font-extrabold text-white transition hover:bg-[#18382f]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}