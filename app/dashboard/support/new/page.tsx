import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import NewSupportForm from "./new-support-form";

export default async function NewSupportPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      fullName: true,
      accountStatus: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.accountStatus !== "ACTIVE") {
    redirect("/login?closed=1");
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col px-3 py-3 sm:px-5 sm:py-5">
        {/* Back */}
        <Link
          href="/dashboard/support"
          className="mb-4 inline-flex w-fit items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <MessageCircle className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              MooGold
            </p>

            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Customer Service
            </h1>

            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Start a chat with our team
              </p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 py-5">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-emerald-400 dark:ring-white/10">
                <MessageCircle className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
                How can we help?
              </h2>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
                Send us a message and our Customer Service team
                will help you. You can also attach a screenshot
                or image if it helps explain the issue.
              </p>
            </div>
          </div>

          {/* First-message composer */}
          <NewSupportForm />
        </div>
      </div>
    </div>
  );
}