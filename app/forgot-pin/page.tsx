import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import ForgotPinClient from "./forgot-pin-client";

export default async function ForgotPinPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    const user = await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      select: {
        phone: true,
        countryCode: true,
      },
    });

    if (user?.phone && user.countryCode) {
      return (
        <ForgotPinClient
          registeredPhone={user.phone}
          registeredCountryCode={user.countryCode}
          authenticatedFlow
        />
      );
    }
  }

  return <ForgotPinClient />;
}