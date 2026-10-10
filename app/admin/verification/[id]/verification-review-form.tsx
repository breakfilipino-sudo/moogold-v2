"use client";

import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  XCircle,
} from "lucide-react";
import {
  useState,
} from "react";

import {
  approveVerification,
  rejectVerification,
  requestMoreInformation,
} from "../actions";

type VerificationReviewFormProps = {
  verificationId: string;
  currentTier:
    | "TIER_1"
    | "TIER_2"
    | "TIER_3";
};

export default function VerificationReviewForm({
  verificationId,
  currentTier,
}: VerificationReviewFormProps) {
  const [showReject, setShowReject] =
    useState(false);

  const [
    showInformation,
    setShowInformation,
  ] = useState(false);

  const approveTier2 =
    approveVerification.bind(
      null,
      verificationId,
    );

  const approveTier3 =
    approveVerification.bind(
      null,
      verificationId,
    );

  const reject =
    rejectVerification.bind(
      null,
      verificationId,
    );

  const requestInformation =
    requestMoreInformation.bind(
      null,
      verificationId,
    );

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Administrative decision
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-900">
          Review this verification
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Approve the customer when the submitted
          information is satisfactory, or request
          additional information when something needs
          clarification.
        </p>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {/* Tier 2 */}
        <form action={approveTier2}>
          <input
            type="hidden"
            name="tier"
            value="TIER_2"
          />

          <button
            type="submit"
            className="flex w-full flex-col rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
          >
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>

            <p className="mt-5 font-black text-emerald-900">
              Approve as Tier 2
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Standard verified customer with higher
              transaction limits.
            </p>

            {currentTier === "TIER_2" ? (
              <span className="mt-4 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                Current tier
              </span>
            ) : null}
          </button>
        </form>

        {/* Tier 3 */}
        <form action={approveTier3}>
          <input
            type="hidden"
            name="tier"
            value="TIER_3"
          />

          <button
            type="submit"
            className="flex w-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-slate-100"
          >
            <div className="flex items-center justify-between">
              <CheckCircle2 className="h-5 w-5 text-slate-700" />
            </div>

            <p className="mt-5 font-black text-slate-900">
              Approve as Tier 3
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Enhanced verification level for customers
              requiring the highest limits.
            </p>

            {currentTier === "TIER_3" ? (
              <span className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Current tier
              </span>
            ) : null}
          </button>
        </form>

        {/* Request information */}
        <button
          type="button"
          onClick={() =>
            setShowInformation(
              (current) => !current,
            )
          }
          className="flex flex-col rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left transition hover:border-blue-300 hover:bg-blue-100"
        >
          <MessageSquare className="h-5 w-5 text-blue-600" />

          <p className="mt-5 font-black text-blue-900">
            Request more information
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            Ask the customer to clarify or provide
            additional information.
          </p>
        </button>
      </div>

      {showInformation ? (
        <form
          action={requestInformation}
          className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5"
        >
          <label
            htmlFor="informationRequest"
            className="text-sm font-black text-blue-900"
          >
            What does the customer need to provide?
          </label>

          <textarea
            id="informationRequest"
            name="informationRequest"
            required
            minLength={5}
            rows={4}
            placeholder="Explain clearly what needs to be clarified or provided."
            className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10"
          />

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <MessageSquare className="h-4 w-4" />
              Request Information
            </button>
          </div>
        </form>
      ) : null}

      {/* Reject */}
      <div className="mt-6 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={() =>
            setShowReject(
              (current) => !current,
            )
          }
          className="inline-flex items-center gap-2 text-sm font-bold text-red-600 transition hover:text-red-700"
        >
          <XCircle className="h-4 w-4" />
          Reject verification
        </button>

        {showReject ? (
          <form
            action={reject}
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5"
          >
            <label
              htmlFor="reason"
              className="text-sm font-black text-red-900"
            >
              Rejection reason
            </label>

            <textarea
              id="reason"
              name="reason"
              required
              minLength={5}
              rows={4}
              placeholder="Explain why the verification cannot be approved."
              className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" />
                Reject Verification
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

        <p>
          Administrative decisions are recorded against
          the verification record and can be audited later.
        </p>
      </div>
    </div>
  );
}