import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import ChangePinForm from "./change-pin-form";

export default async function ChangePinPage() {
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
      id: true,
      phone: true,
      pinHash: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.pinHash) {
    redirect("/dashboard/settings");
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <ChangePinForm
          phone={user.phone ?? ""}
        />
      </div>
    </div>
  );
}