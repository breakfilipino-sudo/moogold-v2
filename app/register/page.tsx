"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { requestRegistrationOtp } from "@/app/auth/actions";
import { COUNTRIES } from "@/lib/phone";
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

const DAYS = Array.from(
  { length: 31 },
  (_, index) => index + 1,
);

export default function RegisterPage() {
  const router = useRouter();


  const t = (key: Parameters<typeof translate>[1]) => translate("en", key);

  const [countryCode, setCountryCode] = useState("US");
  const [countryOpen, setCountryOpen] = useState(false);

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedCountry =
    COUNTRIES.find(
      (country) => country.code === countryCode,
    ) ?? COUNTRIES[0];

  async function handleSubmit(formData: FormData) {
    setError("");

    if (loading) {
      return;
    }

    const fullName = String(
      formData.get("fullName") ?? "",
    ).trim();

    const phone = String(
      formData.get("phone") ?? "",
    )
      .replace(/\D/g, "")
      .trim();

    if (!fullName) {
  setError(t("registrationNameError"));
  return;
}

if (!day || !month || !year) {
  setError(t("registrationDobError"));
  return;
}

if (!phone) {
  setError(t("registrationPhoneError"));
  return;
}

    const monthNumber = String(
      Number(month) + 1,
    ).padStart(2, "0");

    const dayNumber = String(day).padStart(2, "0");

    const dateOfBirth =
      `${year}-${monthNumber}-${dayNumber}`;

    formData.set("fullName", fullName);
    formData.set("dateOfBirth", dateOfBirth);
    formData.set(
      "phone",
      selectedCountry.dialCode + phone,
    );
    formData.set(
      "countryCode",
      selectedCountry.code,
    );

    setLoading(true);

    try {
      const result =
        await requestRegistrationOtp(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.success && result.phone) {
        router.push(
          `/register/verify?phone=${encodeURIComponent(
            result.phone,
          )}`,
        );
      }
    } catch (submitError) {
      console.error(
        "Registration submit error:",
        submitError,
      );

      setError(
        "Something went wrong. Please try again.",
      );
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
              <span className="text-[#55c995]">
                Gold
              </span>
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
    Start with your basic details. It only
    takes a moment.
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
                  Enter your details exactly as they
                  appear on your identification.
                </p>
              </div>

              <form action={handleSubmit}>
                {error && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium leading-4 text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                  >
                    Full legal name
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    required
                    autoComplete="name"
                    placeholder="Name as shown on your ID"
                    className="h-11 w-full rounded-xl border border-[#d6dfda] bg-white px-3.5 text-[13px] font-medium text-[#17231e] outline-none transition placeholder:text-[#a4ada8] focus:border-[#138a5d] focus:shadow-[0_0_0_3px_rgba(19,138,93,.08)]"
                  />
                </div>

                <div className="mt-3.5">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]">
                    Date of birth
                  </label>

                  <div className="grid grid-cols-[0.8fr_1.45fr_1fr] gap-2">
                    <select
                      value={day}
                      onChange={(event) => {
                        setDay(event.target.value);
                        setError("");
                      }}
                      required
                      aria-label="Day of birth"
                      className="h-11 min-w-0 rounded-xl border border-[#d6dfda] bg-white px-1.5 text-[12px] font-medium text-[#17231e] outline-none focus:border-[#138a5d] sm:px-2"
                    >
                      <option value="">Day</option>

                      {DAYS.map((value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      ))}
                    </select>

                    <select
                      value={month}
                      onChange={(event) => {
                        setMonth(event.target.value);
                        setError("");
                      }}
                      required
                      aria-label="Month of birth"
                      className="h-11 min-w-0 rounded-xl border border-[#d6dfda] bg-white px-1.5 text-[12px] font-medium text-[#17231e] outline-none focus:border-[#138a5d] sm:px-2"
                    >
                      <option value="">Month</option>

                      {MONTHS.map(
                        (value, index) => (
                          <option
                            key={value}
                            value={index}
                          >
                            {value}
                          </option>
                        ),
                      )}
                    </select>

                    <select
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value);
                        setError("");
                      }}
                      required
                      aria-label="Year of birth"
                      className="h-11 min-w-0 rounded-xl border border-[#d6dfda] bg-white px-1.5 text-[12px] font-medium text-[#17231e] outline-none focus:border-[#138a5d] sm:px-2"
                    >
                      <option value="">Year</option>

                      {YEARS.map((value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3.5">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]">
                    Country
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setCountryOpen(
                          (open) => !open,
                        )
                      }
                      className="flex h-11 w-full items-center rounded-xl border border-[#d6dfda] bg-white px-3 text-left outline-none transition hover:border-[#c4d0c9] focus:border-[#138a5d] sm:px-3.5"
                    >
                      <span className="mr-2.5 shrink-0 text-base">
                        {selectedCountry.flag}
                      </span>

                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#17231e]">
                        {selectedCountry.name}
                      </span>

                      <span className="ml-2 shrink-0 text-[11px] font-bold text-[#138a5d]">
                        {countryOpen
                          ? "Close"
                          : "Change"}
                      </span>
                    </button>

                    {countryOpen && (
                      <div className="absolute left-0 right-0 top-[calc(100%+5px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-[#d6dfda] bg-white p-1.5 shadow-[0_15px_35px_rgba(20,45,35,0.15)]">
                        {COUNTRIES.map(
                          (country) => {
                            const active =
                              country.code ===
                              countryCode;

                            return (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setCountryCode(
                                    country.code,
                                  );
                                  setCountryOpen(
                                    false,
                                  );
                                  setError("");
                                }}
                                className={`flex w-full items-center rounded-lg px-2.5 py-2.5 text-left transition ${
                                  active
                                    ? "bg-[#edf7f2] text-[#17231e]"
                                    : "text-[#52605a] hover:bg-[#f5f8f6]"
                                }`}
                              >
                                <span className="mr-2.5 shrink-0 text-base">
                                  {country.flag}
                                </span>

                                <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
                                  {country.name}
                                </span>

                                {active && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-[#138a5d]" />
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3.5">
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#52605a]"
                  >
                    Mobile number
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
                      placeholder="Mobile number"
                      className="min-w-0 flex-1 bg-transparent px-3 text-[13px] font-medium text-[#17231e] outline-none placeholder:text-[#a4ada8]"
                    />
                  </div>

                  <p className="mt-1.5 text-[11px] leading-4 text-[#89958f]">
                    Your number will be used to
                    verify your account.
                  </p>
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
                  By continuing, you agree to the
                  MooGold terms and privacy policy.
                </p>
              </form>
            </div>

            <p className="mt-5 text-center text-[11px] leading-5 text-white/25">
              Money • Gold • Crypto • Gift Cards •
              Rewards
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}