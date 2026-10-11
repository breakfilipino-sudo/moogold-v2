import Link from "next/link";
import { ArrowLeft, Brain, Gamepad2, Hash, Zap } from "lucide-react";

const games = [
  {
    name: "Quick Tap",
    description: "A reaction-speed challenge built around quick and accurate taps.",
    Icon: Zap,
  },
  {
    name: "Memory Flip",
    description: "A memory game where you match hidden pairs.",
    Icon: Brain,
  },
  {
    name: "Number Match",
    description: "A simple number and pattern challenge.",
    Icon: Hash,
  },
];

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <Link
          href="/dashboard/wallet"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to wallet
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Gamepad2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Games</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore games planned for MooGold.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-sm leading-6 text-muted-foreground">
          Games are being prepared. Reward eligibility, minimum cash-out
          thresholds, and wallet crediting must be implemented and verified
          before rewards or withdrawals become available.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map(({ name, description, Icon }) => (
          <article
            key={name}
            className="flex min-h-52 flex-col rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Icon className="size-5" />
            </div>
            <h2 className="mt-4 font-semibold">{name}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <span className="mt-5 inline-flex w-fit rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Coming soon
            </span>
          </article>
        ))}
      </div>
    </main>
  );
}