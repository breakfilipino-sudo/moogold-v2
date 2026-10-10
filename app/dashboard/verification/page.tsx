import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import VerificationForm from "./verification-form";

export default async function VerificationPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      countryCode: true,
      verification: {
        select: {
          tier: true,
          status: true,
          dateOfBirth: true,
          countryCode: true,
          documents: {
            select: {
              id: true,
              type: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const verification =
    user.verification ??
    (await prisma.userVerification.create({
      data: {
        userId: user.id,
        tier: "TIER_1",
        status: "NOT_STARTED",
      },
      select: {
        tier: true,
        status: true,
        dateOfBirth: true,
        countryCode: true,
        documents: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    }));

  const isAlreadyVerified =
    verification.tier === "TIER_2" ||
    verification.tier === "TIER_3";

  const isUnderReview =
    verification.status === "UNDER_REVIEW" ||
    verification.status === "IN_PROGRESS";

  return (
    <div className="mx-auto w-full max-w-[920px]">
      <VerificationForm
        fullName={user.fullName || "MooGold User"}
        phone={user.phone || ""}
        registeredCountry={user.countryCode || ""}
        currentTier={verification.tier}
        dateOfBirth={verification.dateOfBirth}
        countryCode={verification.countryCode}
        documents={verification.documents}
        isAlreadyVerified={isAlreadyVerified}
        isUnderReview={isUnderReview}
      />
    </div>
  );
}