"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { requestRegistrationOtp } from "@/app/auth/actions";
import { COUNTRIES } from "@/lib/phone";
import { getSubdivisionConfig } from "@/lib/country-subdivisions";
import { translate } from "@/lib/i18n/translations";

const YEARS = Array.from(
  { length: 110 },
  (_, index) => new Date().getFullYear() - index,
);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

type FieldErrors = Record<string, string>;

function FieldError({
  field,
  message,
}: {
  field: string;
  message?: string;
}) {
  if (!message) return null;

  return (
    <p
      id={`${field}-error`}
      role="alert"
      className="mt-1.5 text-[11px] font-medium leading-4 text-red-600"
    >
      {message}
    </p>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const t = (key: Parameters<typeof translate>[1]) =>
    translate("en", key);

  const [countryCode, setCountryCode] = useState("US");
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateProvince, setStateProvince] = useState("");

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("ref") ?? "").trim().toUpperCase();

    if (code && /^[A-Z0-9]{1,64}$/.test(code)) {
      const frame = requestAnimationFrame(() => {
        setReferralCode((current) => current || code);
      });

      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const selectedCountry =
    COUNTRIES.find((country) => country.code === countryCode) ??
    COUNTRIES[0];

  const subdivisionConfig = getSubdivisionConfig(selectedCountry.code);

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });

    setError("");
  }

  function showFieldErrors(nextErrors: FieldErrors) {
    setFieldErrors(nextErrors);
    setError("");

    const firstInvalidField = Object.keys(nextErrors)[0];

    if (!firstInvalidField) return;

    requestAnimationFrame(() => {
      const target =
        formRef.current?.querySelector<HTMLElement>(
          `[data-error-field="${firstInvalidField}"]`,
        ) ??
        formRef.current?.querySelector<HTMLElement>(
          `#${firstInvalidField}`,
        );

      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      target.focus({ preventScroll: true });
    });
  }

  function getServerErrorField(message: string): string | null {
    const value = message.toLowerCase();

    if (
      value.includes("referral code") ||
      value.includes("referral")
    ) {
      return "referralCode";
    }

    if (value.includes("email") || value.includes("e-mail")) {
      return "email";
    }

    if (
      value.includes("mobile number") ||
      value.includes("phone number") ||
      value.includes("phone") ||
      value.includes("mobile")
    ) {
      return "phone";
    }

    if (
      value.includes("date of birth") ||
      value.includes("birth")
    ) {
      return "dateOfBirth";
    }

    if (value.includes("gender")) {
      return "gender";
    }

    if (value.includes("marital")) {
      return "maritalStatus";
    }

    if (value.includes("address")) {
      return "addressLine1";
    }

    if (value.includes("state") || value.includes("province")) {
      return "stateProvince";
    }

    if (value.includes("country")) {
      return "country";
    }

    if (
      value.includes("first and last name") ||
      value.includes("full legal name") ||
      value.includes("first name") ||
      value.includes("last name") ||
      value.includes("name")
    ) {
      return "firstName";
    }

    return null;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);

    const firstName = String(
      formData.get("firstName") ?? "",
    ).trim();

    const lastName = String(
      formData.get("lastName") ?? "",
    ).trim();

    const fullName = [firstName, lastName]
      .filter(Boolean)
      .join(" ");

    const email = String(
      formData.get("email") ?? "",
    ).trim().toLowerCase();

    const phone = String(
      formData.get("phone") ?? "",
    )
      .replace(/\D/g, "")
      .trim();

    const gender = String(
      formData.get("gender") ?? "",
    );

    const maritalStatus = String(
      formData.get("maritalStatus") ?? "",
    );

    const address = String(
      formData.get("addressLine1") ?? "",
    ).trim();

    const nextErrors: FieldErrors = {};

    if (!firstName) {
      nextErrors.firstName = "Please enter your first name.";
    }

    if (!lastName) {
      nextErrors.lastName = "Please enter your last name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!day || !month || !year) {
      nextErrors.dateOfBirth = t("registrationDobError");
    } else {
      const selectedDate = new Date(
        Number(year),
        Number(month),
        Number(day),
      );

      if (
        selectedDate.getFullYear() !== Number(year) ||
        selectedDate.getMonth() !== Number(month) ||
        selectedDate.getDate() !== Number(day) ||
        selectedDate > new Date()
      ) {
        nextErrors.dateOfBirth =
          "Please enter a valid date of birth.";
      }
    }

    if (!gender) {
      nextErrors.gender = "Please select your gender.";
    }

    if (!maritalStatus) {
      nextErrors.maritalStatus =
        "Please select your marital status.";
    }

    if (!address || address.length > 160) {
      nextErrors.addressLine1 = "Please enter a valid address.";
    }

    if (!stateProvince) {
      nextErrors.stateProvince =
        `Please select your ${subdivisionConfig.label.toLowerCase()}.`;
    }

    if (!phone) {
      nextErrors.phone = t("registrationPhoneError");
    }

    if (Object.keys(nextErrors).length > 0) {
      showFieldErrors(nextErrors);
      return;
    }

    const monthNumber = String(
      Number(month) + 1,
    ).padStart(2, "0");

    const dayNumber = String(day).padStart(2, "0");

    const dateOfBirth = `${year}-${monthNumber}-${dayNumber}`;

    formData.set("firstName", firstName);
    formData.set("lastName", lastName);
    formData.set("fullName", fullName);
    formData.set("email", email);
    formData.set("dateOfBirth", dateOfBirth);
    formData.set(
      "referralCode",
      referralCode.trim().toUpperCase(),
    );
    formData.set(
      "phone",
      selectedCountry.dialCode + phone,
    );
    formData.set("countryCode", selectedCountry.code);

    setLoading(true);

    try {
      const result = await requestRegistrationOtp(formData);

      if (result?.error) {
        const field = getServerErrorField(result.error);

        if (field) {
          showFieldErrors({
            [field]: result.error,
          });
        } else {
          setError(result.error);
        }

        return;
      }

      if (result?.success && result.phone && result.email) {
        router.push(
          `/register/verify?phone=${encodeURIComponent(
            result.phone,
          )}&email=${encodeURIComponent(result.email)}`,
        );
      }
    } catch (submitError) {
      console.error(
        "Registration submit error:",
        submitError,
      );

      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06251b] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#138a5d]/20 blur-[110px]" />

        <div className="absolute -right-40 top-[25%] h-[500px] w-[500px] rounded-full bg-[#b99a52]/10 blur-[120px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(38,166,112,0.10),transparent_42%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 py-5 sm:px-8 sm:py-6 lg:px-10">
        <div className="mx-auto w-full max-w-[760px]">
          <header className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="shrink-0 text-[22px] font-black tracking-[-0.065em] text-white"
            >
              Moo
              <span className="text-[#55c995]">Gold</span>
            </Link>

            <div className="text-right text-[12px] leading-5 text-white/45">
              <span className="hidden sm:inline">
                Already have an account?{" "}
              </span>

              <Link
                href="/login"
                className="text-[13px] font-bold text-[#67d4a1] transition hover:text-white sm:text-[14px]"
              >
                Log in
              </Link>
            </div>
          </header>
        </div>

        <div className="flex flex-1 items-start justify-center pb-6 pt-8 sm:pt-12 lg:items-center lg:pt-10">
          <section className="w-full max-w-[500px]">
            <div className="mb-6 text-center">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="h-px w-7 bg-[#55c995]/35" />
                <span className="h-1.5 w-1.5 rounded-full bg-[#55c995]" />
                <span className="h-px w-7 bg-[#55c995]/35" />
              </div>

              <h1 className="text-[27px] font-black leading-tight tracking-[-0.045em] text-white sm:text-[32px]">
                Open your MooGold account
              </h1>

              <p className="mx-auto mt-2 max-w-[390px] text-[13px] leading-5 text-white/50 sm:text-[14px]">
                Start with your basic details. It only takes a moment.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[#f7faf8] p-4 text-[#17231e] shadow-[0_25px_70px_rgba(0,0,0,0.28)] sm:p-6">
              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#138a5d]">
                    Account details
                  </span>

                  <span className="shrink-0 text-[11px] font-semibold text-[#9aa59f]">
                    Step 1 of 3
                  </span>
                </div>

                <h2 className="text-[21px] font-bold leading-tight tracking-[-0.035em] text-[#17231e] sm:text-[23px]">
                  Your details
                </h2>

                <p className="mt-1 text-[12px] leading-5 text-[#89958f]">
                  Enter your details exactly as they appear on your identification.
                </p>
              </div>

              <form
                ref={formRef}
                onSubmit={handleSubmit}
                noValidate
              >
                {error && (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium leading-4 text-red-600"
                  >
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label
                      htmlFor="firstName"
                      className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                    >
                      First name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      required
                      autoComplete="given-name"
                      maxLength={80}
                      aria-invalid={Boolean(fieldErrors.firstName)}
                      aria-describedby={
                        fieldErrors.firstName
                          ? "firstName-error"
                          : undefined
                      }
                      data-error-field="firstName"
                      placeholder="First name"
                      onChange={() => clearFieldError("firstName")}
                      className="h-11 w-full min-w-0 rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none transition placeholder:text-[#a4ada8] focus:border-[#138a5d] focus:shadow-[0_0_0_3px_rgba(19,138,93,.08)]"
                    />
                    <FieldError
                      field="firstName"
                      message={fieldErrors.firstName}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor="lastName"
                      className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                    >
                      Last name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      required
                      autoComplete="family-name"
                      maxLength={80}
                      aria-invalid={Boolean(fieldErrors.lastName)}
                      aria-describedby={
                        fieldErrors.lastName
                          ? "lastName-error"
                          : undefined
                      }
                      data-error-field="lastName"
                      placeholder="Last name"
                      onChange={() => clearFieldError("lastName")}
                      className="h-11 w-full min-w-0 rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none transition placeholder:text-[#a4ada8] focus:border-[#138a5d] focus:shadow-[0_0_0_3px_rgba(19,138,93,.08)]"
                    />
                    <FieldError
                      field="lastName"
                      message={fieldErrors.lastName}
                    />
                  </div>
                </div>

                <div className="mt-3.5">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]">
                    Date of birth
                  </label>

                  <div
                    data-error-field="dateOfBirth"
                    tabIndex={-1}
                    className="grid grid-cols-[0.8fr_1.45fr_1fr] gap-2 rounded-xl outline-none focus-within:ring-0"
                  >
                    <select
                      id="dateOfBirth"
                      value={day}
                      onChange={(event) => {
                        setDay(event.target.value);
                        clearFieldError("dateOfBirth");
                      }}
                      aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                      aria-describedby={
                        fieldErrors.dateOfBirth
                          ? "dateOfBirth-error"
                          : undefined
                      }
                      required
                      aria-label="Day of birth"
                      className="h-11 min-w-0 rounded-xl border border-[#d6dfda] bg-white px-1.5 text-[12px] font-medium text-[#17231e] outline-none focus:border-[#138a5d] sm:px-2"
                    >
                      <option value="">Day</option>
                      {DAYS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={month}
                      onChange={(event) => {
                        setMonth(event.target.value);
                        clearFieldError("dateOfBirth");
                      }}
                      required
                      aria-label="Month of birth"
                      className="h-11 min-w-0 rounded-xl border border-[#d6dfda] bg-white px-1.5 text-[12px] font-medium text-[#17231e] outline-none focus:border-[#138a5d] sm:px-2"
                    >
                      <option value="">Month</option>
                      {MONTHS.map((value, index) => (
                        <option key={value} value={index}>
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value);
                        clearFieldError("dateOfBirth");
                      }}
                      required
                      aria-label="Year of birth"
                      className="h-11 min-w-0 rounded-xl border border-[#d6dfda] bg-white px-1.5 text-[12px] font-medium text-[#17231e] outline-none focus:border-[#138a5d] sm:px-2"
                    >
                      <option value="">Year</option>
                      {YEARS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FieldError
                    field="dateOfBirth"
                    message={fieldErrors.dateOfBirth}
                  />
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label
                      htmlFor="gender"
                      className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                    >
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      required
                      data-error-field="gender"
                      aria-invalid={Boolean(fieldErrors.gender)}
                      aria-describedby={
                        fieldErrors.gender ? "gender-error" : undefined
                      }
                      onChange={() => clearFieldError("gender")}
                      className="h-11 w-full rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none focus:border-[#138a5d]"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <FieldError
                      field="gender"
                      message={fieldErrors.gender}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor="maritalStatus"
                      className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                    >
                      Marital status
                    </label>
                    <select
                      id="maritalStatus"
                      name="maritalStatus"
                      required
                      data-error-field="maritalStatus"
                      aria-invalid={Boolean(fieldErrors.maritalStatus)}
                      aria-describedby={
                        fieldErrors.maritalStatus
                          ? "maritalStatus-error"
                          : undefined
                      }
                      onChange={() => clearFieldError("maritalStatus")}
                      className="h-11 w-full rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none focus:border-[#138a5d]"
                    >
                      <option value="">Select status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                    <FieldError
                      field="maritalStatus"
                      message={fieldErrors.maritalStatus}
                    />
                  </div>
                </div>

                <div className="mt-3.5">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]">
                    Country
                  </label>

                  <div
                    className="relative"
                    data-error-field="country"
                    tabIndex={-1}
                  >
                    <button
                      id="country"
                      type="button"
                      aria-describedby={
                        fieldErrors.country ? "country-error" : undefined
                      }
                      onClick={() => {
                        setCountryOpen((open) => !open);
                        clearFieldError("country");
                      }}
                      className="flex h-11 w-full items-center rounded-xl border border-[#d6dfda] bg-white px-3 text-left outline-none transition hover:border-[#c4d0c9] focus:border-[#138a5d] sm:px-3.5"
                    >
                      <img
                        src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                        alt={`${selectedCountry.name} flag`}
                        width={24}
                        height={18}
                        className="mr-2.5 h-[18px] w-6 shrink-0 rounded-[2px] object-cover"
                      />

                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#17231e]">
                        {selectedCountry.name}
                      </span>

                      <span className="ml-2 shrink-0 text-[11px] font-bold text-[#138a5d]">
                        {countryOpen ? "Close" : "Change"}
                      </span>
                    </button>

                    {countryOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+5px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-[#d6dfda] bg-white p-1.5 shadow-[0_15px_35px_rgba(20,45,35,0.15)]">
                        {COUNTRIES.map((country) => {
                          const active = country.code === countryCode;

                          return (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setCountryCode(country.code);
                                setStateProvince("");
                                setCountryOpen(false);
                                clearFieldError("country");
                                clearFieldError("stateProvince");
                                clearFieldError("phone");
                              }}
                              className={`flex w-full items-center rounded-lg px-2.5 py-2.5 text-left transition ${
                                active
                                  ? "bg-[#edf7f2] text-[#17231e]"
                                  : "text-[#52605a] hover:bg-[#f5f8f6]"
                              }`}
                            >
                              <img
                                src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                                alt=""
                                width={24}
                                height={18}
                                className="mr-2.5 h-[18px] w-6 shrink-0 rounded-[2px] object-cover"
                              />

                              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                                {country.name}
                              </span>

                              {active && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-[#138a5d]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <FieldError
                    field="country"
                    message={fieldErrors.country}
                  />
                </div>

                <div className="mt-3.5">
                  <label
                    htmlFor="addressLine1"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                  >
                    Address
                  </label>
                  <input
                    id="addressLine1"
                    name="addressLine1"
                    required
                    maxLength={160}
                    autoComplete="street-address"
                    data-error-field="addressLine1"
                    aria-invalid={Boolean(fieldErrors.addressLine1)}
                    aria-describedby={
                      fieldErrors.addressLine1
                        ? "addressLine1-error"
                        : undefined
                    }
                    onChange={() => clearFieldError("addressLine1")}
                    placeholder="Enter your address"
                    className="h-11 w-full rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none placeholder:text-[#a4ada8] focus:border-[#138a5d]"
                  />
                  <FieldError
                    field="addressLine1"
                    message={fieldErrors.addressLine1}
                  />
                </div>

                <div className="mt-3.5">
                  <label
                    htmlFor="stateProvince"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                  >
                    {subdivisionConfig.label}
                  </label>
                  <select
                    id="stateProvince"
                    name="stateProvince"
                    required
                    value={stateProvince}
                    data-error-field="stateProvince"
                    aria-invalid={Boolean(fieldErrors.stateProvince)}
                    aria-describedby={
                      fieldErrors.stateProvince
                        ? "stateProvince-error"
                        : undefined
                    }
                    onChange={(event) => {
                      setStateProvince(event.target.value);
                      clearFieldError("stateProvince");
                    }}
                    className="h-11 w-full rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none focus:border-[#138a5d]"
                  >
                    <option value="">
                      Select {subdivisionConfig.label.toLowerCase()}
                    </option>
                    {subdivisionConfig.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    field="stateProvince"
                    message={fieldErrors.stateProvince}
                  />
                </div>

                <div className="mt-3.5">
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    data-error-field="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? "email-error" : undefined
                    }
                    onChange={() => clearFieldError("email")}
                    placeholder="Enter your email address"
                    className="h-11 w-full rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none transition placeholder:text-[#a4ada8] focus:border-[#138a5d] focus:shadow-[0_0_0_3px_rgba(19,138,93,.08)]"
                  />
                  <FieldError
                    field="email"
                    message={fieldErrors.email}
                  />
                  <p className="mt-1.5 text-[13px] leading-5 text-[#89958f]">
                    We will send your verification code by email.
                  </p>
                </div>

                <div className="mt-3.5">
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                  >
                    Enter your phone number
                  </label>

                  <div className="flex min-w-0 overflow-hidden rounded-xl border border-[#d6dfda] bg-white transition focus-within:border-[#138a5d] focus-within:shadow-[0_0_0_3px_rgba(19,138,93,.08)]">
                    <div className="flex h-11 shrink-0 items-center border-r border-[#e3e9e5] px-3">
                      <span className="text-[12px] font-bold text-[#52605a]">
                        {selectedCountry.dialCode}
                      </span>
                    </div>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      autoComplete="tel-national"
                      data-error-field="phone"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      aria-describedby={
                        fieldErrors.phone ? "phone-error" : undefined
                      }
                      onChange={() => clearFieldError("phone")}
                      placeholder="Enter your phone number"
                      className="min-w-0 flex-1 bg-transparent px-3 text-[13px] font-medium text-[#17231e] outline-none placeholder:text-[#a4ada8]"
                    />
                  </div>
                  <FieldError
                    field="phone"
                    message={fieldErrors.phone}
                  />
                  <p className="mt-1.5 text-[13px] leading-5 text-[#89958f]">
                    Your phone number will be linked to your account.
                  </p>
                </div>

                <div className="mt-3.5">
                  <label
                    htmlFor="referralCode"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                  >
                    Referral code (optional)
                  </label>
                  <input
                    id="referralCode"
                    name="referralCode"
                    type="text"
                    value={referralCode}
                    data-error-field="referralCode"
                    aria-invalid={Boolean(fieldErrors.referralCode)}
                    aria-describedby={
                      fieldErrors.referralCode
                        ? "referralCode-error"
                        : undefined
                    }
                    onChange={(event) => {
                      setReferralCode(
                        event.target.value.toUpperCase().slice(0, 64),
                      );
                      clearFieldError("referralCode");
                    }}
                    maxLength={64}
                    autoComplete="off"
                    placeholder="Enter referral code if you have one"
                    className="h-11 w-full rounded-xl border border-[#d6dfda] bg-white px-3 text-[13px] font-medium text-[#17231e] outline-none transition placeholder:text-[#a4ada8] focus:border-[#138a5d] focus:shadow-[0_0_0_3px_rgba(19,138,93,.08)]"
                  />
                  <FieldError
                    field="referralCode"
                    message={fieldErrors.referralCode}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#138a5d] text-[12px] font-bold text-white shadow-[0_8px_20px_rgba(19,138,93,.20)] transition hover:bg-[#0f7b52] hover:shadow-[0_10px_24px_rgba(19,138,93,.25)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending verification code…
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-[11px] leading-4 text-[#9aa59f]">
                  By continuing, you agree to the MooGold terms and privacy policy.
                </p>
              </form>
            </div>

            <p className="mt-5 text-center text-[11px] leading-5 text-white/25">
              Money • Gold • Crypto • Gift Cards • Rewards
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}