import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfileForm from "./profile-form";

const DEFAULT_STORAGE_BUCKET = "profile-photos";

function getStorageBucket() {
  return (
    process.env.PROFILE_PHOTO_STORAGE_BUCKET?.trim() ||
    DEFAULT_STORAGE_BUCKET
  );
}

function countryName(countryCode: string | null) {
  if (!countryCode) {
    return "Not provided";
  }

  const normalized = countryCode.trim().toUpperCase();

  try {
    const displayNames = new Intl.DisplayNames(["en"], {
      type: "region",
    });

    return displayNames.of(normalized) || normalized;
  } catch {
    return normalized;
  }
}

function getTierLabel(tier: string) {
  switch (tier) {
    case "TIER_1":
      return "Tier 1";

    case "TIER_2":
      return "Tier 2";

    case "TIER_3":
      return "Tier 3";

    default:
      return "Tier 1";
  }
}

export default async function ProfilePage() {
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
      fullName: true,
      phone: true,
      email: true,
      countryCode: true,
      profilePhotoPath: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  let verification =
    await prisma.userVerification.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        tier: true,
        status: true,
      },
    });

  if (!verification) {
    verification =
      await prisma.userVerification.create({
        data: {
          userId: user.id,
          tier: "TIER_1",
          status: "NOT_STARTED",
        },
        select: {
          tier: true,
          status: true,
        },
      });
  }

  let profilePhotoUrl: string | null = null;

  if (user.profilePhotoPath) {
    try {
      const supabaseAdmin = createAdminClient();

      const { data } =
        await supabaseAdmin.storage
          .from(getStorageBucket())
          .createSignedUrl(
            user.profilePhotoPath,
            60 * 60,
          );

      profilePhotoUrl =
        data?.signedUrl ?? null;
    } catch (error) {
      console.error(
        "Profile photo signed URL error:",
        error,
      );
    }
  }

  const fullName =
    user.fullName ||
    user.email?.split("@")[0] ||
    "MooGold User";

  const phoneVerified = Boolean(
    authUser.phone_confirmed_at,
  );

  const emailVerified = Boolean(
    authUser.email_confirmed_at,
  );

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7b8e85]">
          Account
        </p>

        <h1 className="mt-2 text-2xl font-black tracking-tight text-[#10201b] sm:text-3xl">
          My Profile
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#708078]">
          Manage your personal information and account details.
        </p>
      </div>

      <ProfileForm
        fullName={fullName}
        phone={user.phone || ""}
        email={user.email || ""}
        country={countryName(user.countryCode)}
        accountTier={getTierLabel(verification.tier)}
        verificationTier={verification.tier}
        verificationState={verification.status}
        phoneVerified={phoneVerified}
        emailVerified={emailVerified}
        profilePhotoUrl={profilePhotoUrl}
      />
    </div>
  );
}