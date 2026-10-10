import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import EmailChangeForm from "./email-change-form";

export default async function EmailSettingsPage() {
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
      email: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  const currentEmail =
    user.email?.trim() ||
    authUser.email?.trim() ||
    "";

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-xl px-4 py-5 sm:px-6 sm:py-6">
        <EmailChangeForm currentEmail={currentEmail} />
      </div>
    </div>
  );
}