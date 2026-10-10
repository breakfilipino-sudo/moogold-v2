import Link from "next/link";
import {
  ArrowRight,
  Bitcoin,
  BriefcaseBusiness,
  CircleDollarSign,
  Coins,
  CreditCard,
  Gift,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

type AdminCardProps = {
  href: string;
  icon: typeof CreditCard;
  label: string;
  title: string;
  description: string;
  available?: boolean;
};

function AdminCard({
  href,
  icon: Icon,
  label,
  title,
  description,
  available = true,
}: AdminCardProps) {
  const cardContent = (
    <>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          available
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-200 text-slate-500"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>

      <p
        className={`mt-1 text-2xl font-black ${
          available ? "text-slate-900" : "text-slate-700"
        }`}
      >
        {title}
      </p>

      <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>

      {available ? (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-600 transition group-hover:text-emerald-700">
          Open
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      ) : (
        <span className="mt-5 inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500">
          Not Available Yet
        </span>
      )}
    </>
  );

  if (!available) {
    return (
      <div
        aria-disabled="true"
        className="rounded-3xl border border-slate-200 bg-slate-50 p-6 opacity-90"
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      {cardContent}
    </Link>
  );
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              MooGold Administration
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Manage customer funds, products, investments, verification, and
              MooGold operations from one place.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Admin Panel
          </div>
        </div>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Core management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage the main financial operations.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <AdminCard
              href="/admin/deposits"
              icon={CreditCard}
              label="Deposit Management"
              title="Deposits"
              description="Review and manage customer deposit requests."
            />

            <AdminCard
              href="/admin/withdrawals"
              icon={Landmark}
              label="Withdrawal Management"
              title="Withdrawals"
              description="Review customer withdrawal requests and approvals."
            />

            <AdminCard
              href="/admin/wealth-box"
              icon={BriefcaseBusiness}
              label="Investment Management"
              title="Wealth Box"
              description="Review funding requests and approve Wealth Box investments."
            />

            <AdminCard
              href="/admin/crypto"
              icon={Bitcoin}
              label="Digital Assets"
              title="Crypto"
              description="Manage crypto balances, deposits, transactions, and withdrawals."
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Products &amp; earnings
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage MooGold products and customer earning activity.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <AdminCard
              href="/admin/gift-cards"
              icon={Gift}
              label="Gift Card Management"
              title="Gift Cards"
              description="Review customer gift card submissions and manage the gift card system."
            />

            <AdminCard
              href="/admin/transactions"
              icon={Coins}
              label="Gold Activity"
              title="Gold"
              description="Gold administration is not available yet."
              available={false}
            />

            <AdminCard
              href="/admin/transactions"
              icon={Users}
              label="Referral Activity"
              title="Referrals"
              description="Referral administration is not available yet."
              available={false}
            />

            <AdminCard
              href="/admin/transactions"
              icon={CircleDollarSign}
              label="Financial Activity"
              title="Transactions"
              description="View the complete MooGold financial transaction history."
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Customer &amp; support
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage customer verification and support operations.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <AdminCard
              href="/admin/verification"
              icon={ShieldCheck}
              label="Identity Management"
              title="Verification"
              description="Review customer identity verification requests."
            />

            <AdminCard
              href="/admin/support"
              icon={MessageCircle}
              label="Customer Support"
              title="Support"
              description="Handle customer conversations and support requests."
            />

            <AdminCard
              href="/admin/transactions"
              icon={WalletCards}
              label="Wallet Activity"
              title="Wallet"
              description="Wallet administration is not available yet."
              available={false}
            />

            <AdminCard
              href="/admin/transactions"
              icon={Users}
              label="Customer Management"
              title="Users"
              description="Customer administration is not available yet."
              available={false}
            />
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CreditCard className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Deposit Management
                </h2>
                <p className="text-sm text-slate-500">
                  Customer funding enters the system as pending.
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Review customer deposit details and approve eligible payments
              before funds are added to the customer&apos;s available wallet
              balance.
            </p>

            <Link
              href="/admin/deposits"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
            >
              Open deposits
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Wealth Box Management
                </h2>
                <p className="text-sm text-slate-500">
                  Funding approval starts the investment.
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Review card and crypto Wealth Box funding requests. An investment
              is created only after the corresponding payment has been
              verified and approved.
            </p>

            <Link
              href="/admin/wealth-box"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-600 transition hover:text-emerald-700"
            >
              Open Wealth Box
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}