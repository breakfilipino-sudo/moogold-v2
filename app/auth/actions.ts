"use server";

import { createHmac } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getSupportedLanguage,
  type LanguageCode,
} from "@/lib/i18n/languages";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { provisionUser } from "@/lib/auth/provision-user";
import {
  normalizePhone,
  getPhoneValidationMessage,
  type SupportedCountry,
} from "@/lib/phone";
import {
  hashPin,
  isValidPin,
  verifyPin,
} from "@/lib/auth/pin";

type ActionResult = {
  success?: boolean;
  error?: string;
  phone?: string;
  countryCode?: SupportedCountry;
  redirectTo?: string;
  requiresOtp?: boolean;
  profile?: {
    firstName: string;
    phone: string | null;
    countryCode: string | null;
  };
};

function getString(
  formData: FormData,
  key: string,
): string {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

/*
 * ============================================================
 * INTERNAL SUPABASE SESSION CREDENTIAL
 *
 * Customers never see or enter this credential.
 *
 * MooGold authentication remains:
 *
 *   Phone + 4-digit PIN
 *
 * The derived credential is only used server-side to establish
 * the Supabase session after the PIN has already been verified
 * against the bcrypt hash stored in Prisma.
 * ============================================================
 */

function getSupabaseLoginCredential(
  authUserId: string,
  pin: string,
): string {
  const secret =
    process.env.MOOGOLD_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "MOOGOLD_AUTH_SECRET is not configured.",
    );
  }

  return createHmac(
    "sha256",
    secret,
  )
    .update(
      `moogold-supabase-login:${authUserId}:${pin}`,
    )
    .digest("hex");
}

/*
 * ============================================================
 * REGISTRATION
 * ============================================================
 */

export async function requestRegistrationOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const fullName =
    getString(formData, "fullName");

  const dateOfBirth =
    getString(formData, "dateOfBirth");

  const phoneInput =
    getString(formData, "phone");

  const countryInput =
    getString(formData, "countryCode")
      .toUpperCase();

  const countryCode =
    countryInput as SupportedCountry;

  if (!fullName || fullName.length < 2) {
    return {
      error:
        "Please enter your full legal name.",
    };
  }

  if (!dateOfBirth) {
    return {
      error:
        "Please enter your date of birth.",
    };
  }

  const dob = new Date(
    `${dateOfBirth}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(dob.getTime()) ||
    dob > new Date()
  ) {
    return {
      error:
        "Please enter a valid date of birth.",
    };
  }

  if (!phoneInput) {
    return {
      error:
        "Please enter your mobile number.",
    };
  }

  if (
    !countryInput ||
    ![
      "US",
      "PH",
      "SG",
      "MY",
      "KE",
      "GH",
      "NG",
      "ZA",
      "GB",
      "CA",
      "IN",
      "CN",
      "AE",
      "BR",
      "VN",
      "TR",
    ].includes(countryCode)
  ) {
    return {
      error:
        "Please select your country.",
    };
  }

  const phoneResult =
    normalizePhone(
      phoneInput,
      countryCode,
    );

  if (!phoneResult) {
    return {
      error:
        getPhoneValidationMessage(
          countryCode,
        ),
    };
  }

  const { phone } =
    phoneResult;

  const existingUser =
    await prisma.user.findFirst({
      where: {
        phone,
      },
      select: {
        id: true,
      },
    });

  if (existingUser) {
    return {
      error:
        "An account with this mobile number already exists. Please sign in instead.",
    };
  }

  const { error } =
    await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
        data: {
          fullName,
          firstName:
            fullName.split(/\s+/)[0] ??
            fullName,
          middleName: null,
          lastName: null,
          email: null,
          phone,
          countryCode,
          dateOfBirth,
        },
      },
    });

  if (error) {
    console.error(
      "Registration OTP error:",
      {
        message: error.message,
        status: error.status,
        code: error.code,
      },
    );

    return {
      error:
        "We could not send the verification code. Please check your mobile number and try again.",
    };
  }

  return {
    success: true,
    phone,
    countryCode,
  };
}

export async function resendRegistrationOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const phoneInput =
    getString(formData, "phone");

  const countryInput =
    getString(formData, "countryCode")
      .toUpperCase();

  const countryCode =
    countryInput as SupportedCountry;

  if (!phoneInput) {
    return {
      error:
        "Your phone number is missing.",
    };
  }

  const phoneResult =
    normalizePhone(
      phoneInput,
      countryCode,
    );

  if (!phoneResult) {
    return {
      error:
        getPhoneValidationMessage(
          countryCode,
        ),
    };
  }

  const { error } =
    await supabase.auth.signInWithOtp({
      phone: phoneResult.phone,
      options: {
        shouldCreateUser: false,
      },
    });

  if (error) {
    console.error(
      "Registration OTP resend error:",
      error,
    );

    return {
      error:
        "We could not send the verification code. Please try again.",
    };
  }

  return {
    success: true,
    phone: phoneResult.phone,
    countryCode:
      phoneResult.countryCode,
  };
}

export async function verifyRegistrationOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const phone =
    getString(formData, "phone");

  const token =
    getString(formData, "token");

  if (!phone) {
    return {
      error:
        "Your phone number is missing.",
    };
  }

  if (!/^\d{6}$/.test(token)) {
    return {
      error:
        "Please enter the 6-digit verification code.",
    };
  }

  const phoneResult =
    normalizePhone(phone);

  if (!phoneResult) {
    return {
      error:
        "Please enter a valid mobile number.",
    };
  }

  const {
    data,
    error,
  } = await supabase.auth.verifyOtp({
    phone: phoneResult.phone,
    token,
    type: "sms",
  });

  if (error || !data.user) {
    console.error(
      "Registration OTP verification error:",
      error,
    );

    return {
      error:
        "The verification code is invalid or has expired.",
    };
  }

  const metadata =
    data.user.user_metadata ?? {};

  const fullName =
    typeof metadata.fullName === "string"
      ? metadata.fullName.trim()
      : "";

  const email =
    typeof metadata.email === "string"
      ? metadata.email.trim().toLowerCase()
      : null;

  const countryValue =
    typeof metadata.countryCode === "string"
      ? metadata.countryCode.toUpperCase()
      : phoneResult.countryCode;

      const cookieStore = await cookies();
const savedLanguage =
  cookieStore.get("moogold-language")?.value;

const requestedLanguage: LanguageCode =
  savedLanguage === "fil" ||
  savedLanguage === "ms" ||
  savedLanguage === "zh" ||
  savedLanguage === "en"
    ? savedLanguage
    : "en";

const preferredLanguage = getSupportedLanguage(
  requestedLanguage,
  countryValue,
);

  const dateOfBirth =
    typeof metadata.dateOfBirth === "string"
      ? metadata.dateOfBirth
      : null;

  await provisionUser({
    authUserId: data.user.id,
    email,
    phone: phoneResult.phone,
    countryCode: countryValue,
    fullName,
    dateOfBirth,
  });

  return {
    success: true,
    phone: phoneResult.phone,
    countryCode:
      phoneResult.countryCode,
  };
}

/*
 * ============================================================
 * CREATE PIN
 * ============================================================
 */

export async function createPin(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const pin =
    getString(formData, "pin");

  const confirmPin =
    getString(formData, "confirmPin");

  if (!isValidPin(pin)) {
    return {
      error:
        "Choose a different 4-digit PIN. Avoid repeated numbers and simple sequences.",
    };
  }

  if (pin !== confirmPin) {
    return {
      error:
        "The PINs do not match.",
    };
  }

  const {
    data: {
      user: authUser,
    },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/register");
  }

  const user =
    await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      select: {
        id: true,
      },
    });

  if (!user) {
    return {
      error:
        "We could not find your registration. Please start again.",
    };
  }

  const pinHash =
    await hashPin(pin);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      pinHash,
      pinCreatedAt: new Date(),
    },
  });

  /*
   * Establish the internal Supabase password now.
   * This is never shown to the customer.
   */
  const admin =
    createAdminClient();

  const credential =
    getSupabaseLoginCredential(
      authUser.id,
      pin,
    );

  const {
    error: passwordError,
  } =
    await admin.auth.admin.updateUserById(
      authUser.id,
      {
        password: credential,
      },
    );

  if (passwordError) {
    console.error(
      "Supabase PIN credential setup error:",
      passwordError,
    );

    return {
      error:
        "Your PIN was saved, but we could not finish setting up your login. Please try again.",
    };
  }

  return {
    success: true,
  };
}

export async function finishRegistration(): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: {
      user: authUser,
    },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/register");
  }

  const user =
    await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      select: {
        pinHash: true,
        fullName: true,
        phone: true,
        countryCode: true,
      },
    });

  if (!user?.pinHash) {
    redirect("/register/pin");
  }

  const firstName =
    user.fullName
      ?.trim()
      .split(/\s+/)[0] ||
    "there";

  if (
    !user.phone ||
    !user.countryCode
  ) {
    redirect("/register");
  }

  return {
    success: true,
    profile: {
      firstName,
      phone: user.phone,
      countryCode:
        user.countryCode,
    },
  };
}

/*
 * ============================================================
 * LOGIN
 *
 * Phone + 4-digit PIN only.
 * No OTP.
 *
 * The MooGold PIN is verified against the Prisma bcrypt hash.
 * Supabase provides the underlying authenticated session.
 *
 * The Supabase Admin password update is NOT performed on
 * every login. It is only used as a compatibility/self-healing
 * fallback for accounts whose internal credential is missing
 * or out of sync.
 * ============================================================
 */

export async function signInWithPin(
  formData: FormData,
): Promise<ActionResult> {
  const startedAt = performance.now();

  const elapsed = () =>
    `${Math.round(performance.now() - startedAt)}ms`;

  const phoneInput =
    getString(formData, "phone");

  const pin =
    getString(formData, "pin");

  if (!phoneInput) {
    return {
      error:
        "Please enter your mobile number.",
    };
  }

  if (!/^\d{4}$/.test(pin)) {
    return {
      error:
        "Please enter your 4-digit PIN.",
    };
  }

  const phoneResult =
    normalizePhone(phoneInput);

  if (!phoneResult) {
    return {
      error:
        "Please enter a valid mobile number.",
    };
  }

  console.log(
    `[login-timing] start ${elapsed()}`,
  );

  /*
   * Find the MooGold account first.
   */
  const prismaStartedAt =
    performance.now();

  const user =
    await prisma.user.findUnique({
      where: {
        phone: phoneResult.phone,
      },
      select: {
        authUserId: true,
        pinHash: true,
        fullName: true,
        phone: true,
        countryCode: true,
        accountStatus: true,
      },
    });

  console.log(
    `[login-timing] prisma user lookup: ${Math.round(
      performance.now() - prismaStartedAt,
    )}ms | total ${elapsed()}`,
  );

  if (!user || !user.pinHash) {
    return {
      error:
        "We could not find an account with that phone number.",
    };
  }

  if (
    String(user.accountStatus) ===
    "CLOSED"
  ) {
    return {
      error:
        "This MooGold account has been closed.",
    };
  }

  /*
   * Verify the actual MooGold PIN.
   */
  const bcryptStartedAt =
    performance.now();

  const validPin =
    await verifyPin(
      pin,
      user.pinHash,
    );

  console.log(
    `[login-timing] bcrypt verify: ${Math.round(
      performance.now() - bcryptStartedAt,
    )}ms | total ${elapsed()}`,
  );

  if (!validPin) {
    return {
      error:
        "Incorrect PIN. Please try again.",
    };
  }

  /*
   * Derive the deterministic internal Supabase credential.
   */
  const hmacStartedAt =
    performance.now();

  const credential =
    getSupabaseLoginCredential(
      user.authUserId,
      pin,
    );

  console.log(
    `[login-timing] HMAC credential: ${Math.round(
      performance.now() - hmacStartedAt,
    )}ms | total ${elapsed()}`,
  );

  /*
   * Create the SSR client.
   */
  const clientStartedAt =
    performance.now();

  const supabase =
    await createClient();

  console.log(
    `[login-timing] create Supabase client: ${Math.round(
      performance.now() - clientStartedAt,
    )}ms | total ${elapsed()}`,
  );

  /*
   * Fast path:
   * establish the Supabase session.
   */
  const supabaseLoginStartedAt =
    performance.now();

  let {
    data: sessionData,
    error: signInError,
  } =
    await supabase.auth.signInWithPassword({
      phone: phoneResult.phone,
      password: credential,
    });

  console.log(
    `[login-timing] Supabase signInWithPassword #1: ${Math.round(
      performance.now() - supabaseLoginStartedAt,
    )}ms | total ${elapsed()} | success ${
      !signInError && !!sessionData.user
    }`,
  );

  /*
   * Compatibility/self-healing path.
   */
  if (
    signInError ||
    !sessionData.user
  ) {
    console.log(
      `[login-timing] fallback required | total ${elapsed()}`,
    );

    const admin =
      createAdminClient();

    const adminStartedAt =
      performance.now();

    const {
      error: passwordError,
    } =
      await admin.auth.admin.updateUserById(
        user.authUserId,
        {
          password: credential,
        },
      );

    console.log(
      `[login-timing] Supabase admin password sync: ${Math.round(
        performance.now() - adminStartedAt,
      )}ms | total ${elapsed()}`,
    );

    if (passwordError) {
      console.error(
        "Supabase login credential setup error:",
        passwordError,
      );

      return {
        error:
          "We could not establish your secure login session. Please try again.",
      };
    }

    /*
     * Retry the actual session establishment.
     */
    const retryStartedAt =
      performance.now();

    ({
      data: sessionData,
      error: signInError,
    } =
      await supabase.auth.signInWithPassword({
        phone: phoneResult.phone,
        password: credential,
      }));

    console.log(
      `[login-timing] Supabase signInWithPassword #2: ${Math.round(
        performance.now() - retryStartedAt,
      )}ms | total ${elapsed()} | success ${
        !signInError && !!sessionData.user
      }`,
    );
  }

  if (
    signInError ||
    !sessionData.user
  ) {
    console.error(
      "Supabase PIN sign-in error:",
      signInError,
    );

    return {
      error:
        "Your login session could not be established. Please try again.",
    };
  }

  /*
   * Defense-in-depth:
   * confirm the session belongs to the same
   * MooGold account whose PIN was verified.
   */
  if (
    sessionData.user.id !==
    user.authUserId
  ) {
    await supabase.auth.signOut();

    console.log(
      `[login-timing] account identity mismatch | total ${elapsed()}`,
    );

    return {
      error:
        "We could not verify your MooGold account.",
    };
  }

  const firstName =
    user.fullName
      ?.trim()
      .split(/\s+/)[0] ??
    "there";

  console.log(
    `[login-timing] LOGIN COMPLETE | total ${elapsed()}`,
  );

  return {
    success: true,
    redirectTo: "/dashboard",
    profile: {
      firstName,
      phone: user.phone,
      countryCode:
        user.countryCode,
    },
  };
}

/*
 * ============================================================
 * LEGACY OTP EXPORTS
 *
 * Kept so existing pages do not break.
 *
 * IMPORTANT:
 * These are NOT used by normal login.
 * Normal login remains phone + 4-digit PIN.
 * ============================================================
 */

export async function requestLoginOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const phoneInput =
    getString(formData, "phone");

  const phoneResult =
    normalizePhone(phoneInput);

  if (!phoneResult) {
    return {
      error:
        "Please enter a valid mobile number.",
    };
  }

  const user =
    await prisma.user.findUnique({
      where: {
        phone: phoneResult.phone,
      },
      select: {
        authUserId: true,
      },
    });

  if (!user) {
    return {
      error:
        "We could not find an account with that phone number.",
    };
  }

  const { error } =
    await supabase.auth.signInWithOtp({
      phone: phoneResult.phone,
      options: {
        shouldCreateUser: false,
      },
    });

  if (error) {
    console.error(
      "Login OTP error:",
      error,
    );

    return {
      error:
        "We could not send the verification code. Please try again.",
    };
  }

  return {
    success: true,
    phone: phoneResult.phone,
  };
}

export async function verifyLoginOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const phone =
    getString(formData, "phone");

  const token =
    getString(formData, "token");

  if (!phone) {
    return {
      error:
        "Your phone number is missing.",
    };
  }

  if (!/^\d{6}$/.test(token)) {
    return {
      error:
        "Please enter the 6-digit verification code.",
    };
  }

  const phoneResult =
    normalizePhone(phone);

  if (!phoneResult) {
    return {
      error:
        "Please enter a valid mobile number.",
    };
  }

  const { error } =
    await supabase.auth.verifyOtp({
      phone: phoneResult.phone,
      token,
      type: "sms",
    });

  if (error) {
    return {
      error:
        "The verification code is invalid or has expired.",
    };
  }

  return {
    success: true,
  };
}

/*
 * ============================================================
 * LOGOUT
 * ============================================================
 */

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}

/*
 * ============================================================
 * FORGOT PIN
 * ============================================================
 */

export async function requestPinResetOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const phoneInput =
    getString(formData, "phone");

  if (!phoneInput) {
    return {
      error:
        "Please enter your mobile number.",
    };
  }

  const phoneResult =
    normalizePhone(phoneInput);

  if (!phoneResult) {
    return {
      error:
        "Please enter a valid mobile number.",
    };
  }

  const user =
    await prisma.user.findUnique({
      where: {
        phone: phoneResult.phone,
      },
      select: {
        authUserId: true,
      },
    });

  if (!user) {
    return {
      success: true,
      phone: phoneResult.phone,
    };
  }

  const { error } =
    await supabase.auth.signInWithOtp({
      phone: phoneResult.phone,
      options: {
        shouldCreateUser: false,
      },
    });

  if (error) {
    console.error(
      "PIN reset OTP error:",
      error,
    );

    return {
      error:
        "We could not send the verification code. Please try again.",
    };
  }

  return {
    success: true,
    phone: phoneResult.phone,
  };
}

export async function verifyPinResetOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const phone =
    getString(formData, "phone");

  const token =
    getString(formData, "token");

  if (!phone) {
    return {
      error:
        "Your phone number is missing.",
    };
  }

  if (!/^\d{6}$/.test(token)) {
    return {
      error:
        "Please enter the 6-digit verification code.",
    };
  }

  const phoneResult =
    normalizePhone(phone);

  if (!phoneResult) {
    return {
      error:
        "Please enter a valid mobile number.",
    };
  }

  const user =
    await prisma.user.findUnique({
      where: {
        phone: phoneResult.phone,
      },
      select: {
        authUserId: true,
      },
    });

  if (!user) {
    return {
      error:
        "We could not verify this account.",
    };
  }

  const {
    data,
    error,
  } =
    await supabase.auth.verifyOtp({
      phone: phoneResult.phone,
      token,
      type: "sms",
    });

  if (
    error ||
    !data.user ||
    data.user.id !==
      user.authUserId
  ) {
    await supabase.auth.signOut();

    return {
      error:
        "The verification code is invalid or has expired.",
    };
  }

  const {
    error: metadataError,
  } =
    await supabase.auth.updateUser({
      data: {
        pinResetVerified: true,
        pinResetPhone:
          phoneResult.phone,
      },
    });

  if (metadataError) {
    console.error(
      "PIN reset authorization error:",
      metadataError,
    );

    return {
      error:
        "We could not start the PIN reset process. Please try again.",
    };
  }

  return {
    success: true,
    phone: phoneResult.phone,
  };
}

export async function resetPin(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const pin =
    getString(formData, "pin");

  const confirmPin =
    getString(formData, "confirmPin");

  if (!isValidPin(pin)) {
    return {
      error:
        "Choose a different 4-digit PIN. Avoid repeated numbers and simple sequences.",
    };
  }

  if (pin !== confirmPin) {
    return {
      error:
        "The PINs do not match.",
    };
  }

  const {
    data: {
      user: authUser,
    },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      error:
        "Your verification session has expired. Please start again.",
    };
  }

  const metadata =
    authUser.user_metadata ?? {};

  const resetVerified =
    metadata.pinResetVerified === true;

  const resetPhone =
    typeof metadata.pinResetPhone ===
    "string"
      ? metadata.pinResetPhone
      : "";

  if (
    !resetVerified ||
    !resetPhone
  ) {
    return {
      error:
        "Your PIN reset session is invalid or has expired. Please start again.",
    };
  }

  const user =
    await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      select: {
        id: true,
        phone: true,
      },
    });

  if (
    !user ||
    user.phone !== resetPhone
  ) {
    return {
      error:
        "We could not verify your MooGold account.",
    };
  }

  const pinHash =
    await hashPin(pin);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      pinHash,
      pinCreatedAt: new Date(),
    },
  });

  /*
   * Keep the internal Supabase credential synchronized
   * with the new MooGold PIN.
   */
  const admin =
    createAdminClient();

  const credential =
    getSupabaseLoginCredential(
      authUser.id,
      pin,
    );

  const {
    error: passwordError,
  } =
    await admin.auth.admin.updateUserById(
      authUser.id,
      {
        password: credential,
      },
    );

  if (passwordError) {
    console.error(
      "Supabase PIN reset credential error:",
      passwordError,
    );

    return {
      error:
        "Your PIN was changed, but we could not finish updating your secure login. Please try signing in again.",
    };
  }

  await supabase.auth.updateUser({
    data: {
      pinResetVerified: false,
      pinResetPhone: null,
    },
  });

  await supabase.auth.signOut();

  return {
    success: true,
  };
}