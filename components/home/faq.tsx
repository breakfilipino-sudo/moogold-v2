"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How does investing in gold work?",
    answer:
      "Deposit funds into your MooGold wallet, then invest any amount directly from your wallet balance. Your gold holdings are updated instantly in your portfolio.",
  },
  {
    question: "Is there a minimum investment?",
    answer:
      "Yes. MooGold allows flexible investing so you can start with a small amount and increase your investment whenever you want.",
  },
  {
    question: "Can I sell my gold anytime?",
    answer:
      "Yes. You may sell your gold based on the current market price and the proceeds will be credited back to your wallet balance.",
  },
  {
    question: "How are gold prices updated?",
    answer:
      "Gold prices are synchronized with live market data to provide transparent pricing before every purchase or sale.",
  },
  {
    question: "Is MooGold secure?",
    answer:
      "Yes. We use encrypted communication, secure authentication and modern security practices to help protect your account and assets.",
  },
  {
    question: "How do withdrawals work?",
    answer:
      "After selling your gold, your available balance returns to your wallet and you can request a withdrawal using the supported payment methods.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-5xl px-6">

        <div className="mx-auto mb-16 max-w-3xl text-center">

          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
            Frequently Asked Questions
          </span>

          <h2 className="mt-6 text-4xl font-black text-slate-900 lg:text-5xl">
            Everything You Need to Know
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Here are the most common questions about investing with MooGold.
          </p>

        </div>

        <div className="space-y-5">

          {faqs.map((faq, index) => {
            const isOpen = open === index;

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-center justify-between px-8 py-6 text-left"
                >
                  <span className="text-lg font-bold text-slate-900">
                    {faq.question}
                  </span>

                  <ChevronDown
                    className={`h-6 w-6 text-emerald-600 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                                <div
                  className={`grid transition-all duration-300 ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-8 pb-6 leading-7 text-slate-600">
                      {faq.answer}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}

        </div>

      </div>

    </section>
  );
}