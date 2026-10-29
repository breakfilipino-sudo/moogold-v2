"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
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
  COUNTRIES,
  normalizePhone,
  isPlausibleMobilePhone,
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
  email?: string;
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

type PendingRegistration = {
  email: string;
  phone: string;
  countryCode: SupportedCountry;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  issuedAt: number;
};

const REGISTRATION_PENDING_COOKIE = "moogold-registration-pending";
const REGISTRATION_PENDING_TTL_SECONDS = 15 * 60;

function signPendingRegistration(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function readPendingRegistration(
  cookieValue: string | undefined,
  secret: string,
): PendingRegistration | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [encodedPayload, suppliedSignature] = parts;
  const expectedSignature = signPendingRegistration(encodedPayload, secret);
  const expectedBytes = Buffer.from(expectedSignature, "base64url");
  const suppliedBytes = Buffer.from(suppliedSignature, "base64url");

  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<PendingRegistration>;

    const now = Date.now();
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.phone !== "string" ||
      typeof parsed.countryCode !== "string" ||
      typeof parsed.firstName !== "string" ||
      typeof parsed.lastName !== "string" ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.dateOfBirth !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      parsed.issuedAt > now + 60_000 ||
      now - parsed.issuedAt > REGISTRATION_PENDING_TTL_SECONDS * 1000
    ) {
      return null;
    }

    return parsed as PendingRegistration;
  } catch {
    return null;
  }
}
type VerifiedRegistration = {
  authUserId: string;
  email: string;
  phone: string;
  countryCode: SupportedCountry;
  issuedAt: number;
};

const VERIFIED_REGISTRATION_COOKIE = "moogold-registration-verified";
const VERIFIED_REGISTRATION_TTL_SECONDS = 15 * 60;

function readVerifiedRegistration(
  cookieValue: string | undefined,
  secret: string,
): VerifiedRegistration | null {
  if (!cookieValue) return null;

  const parts = cookieValue.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [encodedPayload, suppliedSignature] = parts;
  const expectedSignature = signPendingRegistration(encodedPayload, secret);
  const expectedBytes = Buffer.from(expectedSignature, "base64url");
  const suppliedBytes = Buffer.from(suppliedSignature, "base64url");

  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<VerifiedRegistration>;

    const now = Date.now();

    if (
      typeof parsed.authUserId !== "string" ||
      !parsed.authUserId ||
      typeof parsed.email !== "string" ||
      typeof parsed.phone !== "string" ||
      typeof parsed.countryCode !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      parsed.issuedAt > now + 60_000 ||
      now - parsed.issuedAt > VERIFIED_REGISTRATION_TTL_SECONDS * 1000
    ) {
      return null;
    }

    return parsed as VerifiedRegistration;
  } catch {
    return null;
  }
}

export async function requestRegistrationOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const firstName = getString(formData, "firstName").trim();
  const lastName = getString(formData, "lastName").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const dateOfBirth = getString(formData, "dateOfBirth");
  const email = getString(formData, "email").trim().toLowerCase();
  const phoneInput = getString(formData, "phone");
  const countryInput = getString(formData, "countryCode").toUpperCase();
  const countryCode = countryInput as SupportedCountry;

  if (
    !firstName ||
    !lastName ||
    firstName.length > 80 ||
    lastName.length > 80 ||
    fullName.length < 2
  ) {
    return { error: "Please enter your first and last name." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (
    !dateOfBirth ||
    Number.isNaN(dob.getTime()) ||
    dob > new Date() ||
    dob.toISOString().slice(0, 10) !== dateOfBirth
  ) {
    return { error: "Please enter a valid date of birth." };
  }

  const supportedCountries = [
    "US", "PH", "SG", "MY", "KE", "GH", "NG", "ZA",
    "GB", "CA", "IN", "CN", "AE", "BR", "VN", "TR",
  ];

  if (!phoneInput || !supportedCountries.includes(countryCode)) {
    return { error: "Please enter a valid mobile number and select your country." };
  }

  const phoneResult = normalizePhone(phoneInput, countryCode);
  if (
    !phoneResult ||
    phoneResult.countryCode !== countryCode ||
    !isPlausibleMobilePhone(phoneResult.phone, countryCode)
  ) {
    return { error: getPhoneValidationMessage(countryCode) };
  }

  const phone = phoneResult.phone;

  const existingPhone = await prisma.user.findFirst({
    where: { phone },
    select: { id: true },
  });

  if (existingPhone) {
    return {
      error: "An account with this mobile number already exists. Please sign in instead.",
    };
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existingEmail) {
    return {
      error: "An account with this email address already exists. Please sign in instead.",
    };
  }

  const registrationSecret = process.env.MOOGOLD_AUTH_SECRET;
  if (!registrationSecret) {
    console.error("MOOGOLD_AUTH_SECRET is not configured.");
    return { error: "Registration is temporarily unavailable. Please try again later." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        fullName,
        firstName,
        middleName: null,
        lastName,
        email,
        phone,
        countryCode,
        dateOfBirth,
      },
    },
  });

  if (error) {
    console.error("Registration email OTP error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return {
      error: "We could not send the verification email. Please check your email address and try again.",
    };
  }

  const pendingRegistration: PendingRegistration = {
    email,
    phone,
    countryCode,
    firstName,
    lastName,
    fullName,
    dateOfBirth,
    issuedAt: Date.now(),
  };
  const encodedPayload = Buffer.from(
    JSON.stringify(pendingRegistration),
    "utf8",
  ).toString("base64url");
  const signature = signPendingRegistration(encodedPayload, registrationSecret);
  const cookieStore = await cookies();

  cookieStore.set(
    REGISTRATION_PENDING_COOKIE,
    `${encodedPayload}.${signature}`,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/register",
      maxAge: REGISTRATION_PENDING_TTL_SECONDS,
    },
  );

  return { success: true, phone, email, countryCode };
}

export async function resendRegistrationOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const email = getString(formData, "email").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Your email address is missing or invalid." };
  }

  const registrationSecret = process.env.MOOGOLD_AUTH_SECRET;
  if (!registrationSecret) {
    console.error("MOOGOLD_AUTH_SECRET is not configured.");
    return { error: "Registration is temporarily unavailable. Please try again later." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    console.error("Registration email OTP resend error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return { error: "We could not send the verification email. Please try again." };
  }

  return { success: true, email };
}

export async function verifyRegistrationOtp(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const email = getString(formData, "email").trim().toLowerCase();
  const phone = getString(formData, "phone");
  const token = getString(formData, "token");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Your email address is missing or invalid." };
  }

  if (!phone) {
    return { error: "Your mobile number is missing." };
  }

  if (!/^\d{6}$/.test(token)) {
    return { error: "Please enter the 6-digit verification code." };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.user) {
    console.error("Registration email OTP verification error:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    return { error: "The verification code is invalid or has expired." };
  }

  const verifiedEmail = (data.user.email ?? "").trim().toLowerCase();

  if (!verifiedEmail || verifiedEmail !== email) {
    return { error: "The verified email does not match this registration. Please start again." };
  }

  const registrationSecret = process.env.MOOGOLD_AUTH_SECRET;
  const pendingCookieStore = await cookies();
  const pending = registrationSecret
    ? readPendingRegistration(
        pendingCookieStore.get(REGISTRATION_PENDING_COOKIE)?.value,
        registrationSecret,
      )
    : null;

  if (!pending || pending.email !== verifiedEmail) {
    return {
      error: "Your registration session has expired. Please start registration again and request a new code.",
    };
  }

  const requestedPhone = normalizePhone(phone, pending.countryCode);
  const savedPhone = normalizePhone(pending.phone, pending.countryCode);

  console.error("Registration phone validation diagnostic:", {
    requestedPhoneValid: Boolean(requestedPhone),
    savedPhoneValid: Boolean(savedPhone),
    phoneMatches: Boolean(
      requestedPhone &&
      savedPhone &&
      requestedPhone.phone === savedPhone.phone,
    ),
    savedPhoneCanonical: Boolean(
      savedPhone && savedPhone.phone === pending.phone,
    ),
    savedPhonePlausible: Boolean(
      savedPhone &&
      isPlausibleMobilePhone(savedPhone.phone, pending.countryCode),
    ),
  });

  if (
    !requestedPhone ||
    !savedPhone ||
    requestedPhone.phone !== savedPhone.phone ||
    savedPhone.phone !== pending.phone ||
    !isPlausibleMobilePhone(savedPhone.phone, pending.countryCode)
  ) {
    return {
      error: "Your registration details could not be confirmed. Please start registration again.",
    };
  }

  const countryValue = pending.countryCode;
  const fullName = pending.fullName;
  const verifiedPhone = pending.phone;
  const dateOfBirth = pending.dateOfBirth || null;
  const cookieStore = await cookies();
  const savedLanguage = cookieStore.get("moogold-language")?.value;

  const requestedLanguage: LanguageCode =
    savedLanguage === "fil" ||
    savedLanguage === "ms" ||
    savedLanguage === "zh" ||
    savedLanguage === "en"
      ? savedLanguage
      : "en";

  getSupportedLanguage(requestedLanguage, countryValue);

  await provisionUser({
    authUserId: data.user.id,
    email: verifiedEmail,
    phone: verifiedPhone,
    countryCode: countryValue,
    fullName,
    dateOfBirth,
  });

  const verifiedRegistration: VerifiedRegistration = {
    authUserId: data.user.id,
    email: verifiedEmail,
    phone: verifiedPhone,
    countryCode: countryValue,
    issuedAt: Date.now(),
  };
  const verifiedPayload = Buffer.from(
    JSON.stringify(verifiedRegistration),
    "utf8",
  ).toString("base64url");
  const verifiedSignature = signPendingRegistration(
    verifiedPayload,
    registrationSecret!,
  );

  pendingCookieStore.set(
    VERIFIED_REGISTRATION_COOKIE,
    `${verifiedPayload}.${verifiedSignature}`,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/register",
      maxAge: VERIFIED_REGISTRATION_TTL_SECONDS,
    },
  );

  pendingCookieStore.set(REGISTRATION_PENDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/register",
    maxAge: 0,
  });

  return {
    success: true,
    phone: verifiedPhone,
    email: verifiedEmail,
    countryCode: countryValue,
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

  const registrationSecret = process.env.MOOGOLD_AUTH_SECRET;
  const cookieStore = await cookies();
  const verifiedRegistration =
    registrationSecret
      ? readVerifiedRegistration(
          cookieStore.get(VERIFIED_REGISTRATION_COOKIE)?.value,
          registrationSecret,
        )
      : null;

  if (!verifiedRegistration) {
    redirect("/register");
  }

  const admin = createAdminClient();
  const {
    data: { user: authUser },
    error: authUserError,
  } = await admin.auth.admin.getUserById(
    verifiedRegistration.authUserId,
  );

  const verifiedAuthEmail = (authUser?.email ?? "").trim().toLowerCase();

  if (
    authUserError ||
    !authUser ||
    !verifiedAuthEmail ||
    verifiedAuthEmail !== verifiedRegistration.email
  ) {
    console.error(
      "Verified registration account lookup failed:",
      authUserError?.message ?? "The account identity could not be verified.",
    );
    return {
      error: "We could not verify your registration. Please start again.",
    };
  }

  const user =
    await prisma.user.findUnique({
      where: {
        authUserId: authUser.id,
      },
      select: { id: true, fullName: true, phone: true, countryCode: true },
    });

  if (!user) {
    return {
      error: "We could not find your registration. Please start again.",
    };
  }

  if (
    !user.phone ||
    !user.countryCode ||
    user.phone !== verifiedRegistration.phone ||
    user.countryCode !== verifiedRegistration.countryCode
  ) {
    return {
      error: "Your registration details are incomplete or do not match. Please start again.",
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

  // Establish a fresh customer session after the admin password update.
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.signInWithPassword({
    email: verifiedRegistration.email,
    password: credential,
  });

  if (
    sessionError ||
    !sessionData.session ||
    sessionData.user.id !== authUser.id
  ) {
    console.error(
      "Registration session setup failed:",
      sessionError?.message ?? "Session or account identity was not verified.",
    );

    await supabase.auth.signOut();
    redirect("/login");
  }
  cookieStore.set(VERIFIED_REGISTRATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/register",
    maxAge: 0,
  });

  const firstName = user.fullName?.trim().split(/\s+/)[0] || "there";

  return {
    success: true,
    profile: {
      firstName,
      phone: user.phone,
      countryCode: user.countryCode,
    },
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

  const isInternationalInput = phoneInput.trim().startsWith("+");

  const phoneCandidates = isInternationalInput
    ? [normalizePhone(phoneInput)].flatMap((candidate) =>
        candidate ? [candidate] : [],
      )
    : COUNTRIES.flatMap((country) => {
        const candidate = normalizePhone(phoneInput, country.code);
        return candidate ? [candidate] : [];
      });

  const uniquePhoneCandidates = Array.from(
    new Map(
      phoneCandidates.map((candidate) => [
        `${candidate.phone}:${candidate.countryCode}`,
        candidate,
      ]),
    ).values(),
  );

  if (uniquePhoneCandidates.length === 0) {
    return {
      error: "Please enter a valid mobile number.",
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

  const matchingUsers = await prisma.user.findMany({
      where: {
        phone: {
          in: uniquePhoneCandidates.map((candidate) => candidate.phone),
        },
      },
      select: {
        authUserId: true,
        email: true,
        pinHash: true,
        fullName: true,
        phone: true,
        countryCode: true,
        accountStatus: true,
      },
    });

  const matchingAccounts = matchingUsers.filter((candidate) =>
    uniquePhoneCandidates.some(
      (phoneCandidate) =>
        phoneCandidate.phone === candidate.phone &&
        phoneCandidate.countryCode === candidate.countryCode,
    ),
  );

  if (matchingAccounts.length > 1) {
    return {
      error:
        "More than one account matches this local number. Enter your number with its country code.",
    };
  }

  const user = matchingAccounts[0] ?? null;

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


  if (!user.email) {
    return {
      error:
        "We could not establish your secure login session. Please contact support.",
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
    await supabase.auth.signInWithPassword({ email: user.email, password: credential });

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
      await supabase.auth.signInWithPassword({ email: user.email, password: credential }));

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
  const credential =
    getSupabaseLoginCredential(
      authUser.id,
      pin,
    );

  const admin = createAdminClient();

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