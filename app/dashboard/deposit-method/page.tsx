import Image from "next/image";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getCountryFinancialConfig } from "@/lib/countries";

type DepositMethodOption = {
  name: string;
  description: string;
  href: string;
  logo: {
    src: string;
    width: number;
    height: number;
    className: string;
  };
};

export default async function DepositMethodPage() {
  const { user } = await getCurrentUser();
  const country = getCountryFinancialConfig(user.countryCode);

  if (!country) {
    return null;
  }

  const countryCode = country.code.toUpperCase();

  const methods: DepositMethodOption[] = [
    {
      name: "Credit/Debit Card",
      description: "Deposit securely with your bank card",
      href: "/dashboard/deposit",
      logo: {
        src: "/images/card.png",
        width: 220,
        height: 80,
        className: "h-7 w-[76px] object-contain",
      },
    },
    {
      name: "Cryptocurrency",
      description: "Deposit using supported digital currencies",
      href: "/dashboard/deposit/crypto",
      logo: {
        src: "/images/bitcoin.svg",
        width: 96,
        height: 96,
        className: "h-8 w-8 object-contain",
      },
    },
    ...(countryCode === "PH"
      ? [
          {
            name: "GCash",
            description: "Deposit directly from your GCash wallet",
            href: "/dashboard/deposit/gcash",
            logo: {
              src: "/images/gcash.svg",
              width: 180,
              height: 60,
              className: "h-7 w-[76px] object-contain",
            },
          },
          {
            name: "Maya",
            description: "Deposit directly from your Maya wallet",
            href: "/dashboard/deposit/maya/start",
            logo: {
              src: "/images/maya.jpg",
              width: 180,
              height: 60,
              className: "h-7 w-[76px] object-contain",
            },
          },
        ]
      : []),
    ...(countryCode === "MY"
      ? [
          {
            name: "Touch 'n Go",
            description: "Deposit using your Touch 'n Go wallet",
            href: "/dashboard/deposit/touch-n-go",
            logo: {
              src: "/images/touch-n-go.svg",
              width: 180,
              height: 60,
              className: "h-7 w-[76px] object-contain",
            },
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 pb-8">
      <div className="space-y-3">
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
        >
          ← Back to wallet
        </Link>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Choose deposit method
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Select how you want to add money to your wallet.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {methods.map((method) => (
          <Link
            key={method.href}
            href={method.href}
            aria-label={`${method.name}: ${method.description}`}
            className="flex min-h-[84px] w-full items-center justify-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/30"
          >
            <span className="flex h-12 w-[76px] shrink-0 items-center justify-center rounded-xl bg-slate-50">
              <Image
                src={method.logo.src}
                alt=""
                width={method.logo.width}
                height={method.logo.height}
                className={method.logo.className}
              />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold tracking-tight text-slate-900">
                {method.name}
              </span>
              <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">
                {method.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
