"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPushCampaign } from "./actions";

type Recipient = {
  id: string;
  name: string;
  countryCode: string | null;
  deviceCount: number;
};

type Campaign = {
  id: string;
  title: string;
  audience: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveryCount: number;
};

export default function PushCampaignManager({
  users,
  campaigns,
}: {
  users: Recipient[];
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const [audience, setAudience] = useState<"ALL" | "SELECTED">("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleRecipient(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function submitCampaign(formData: FormData) {
    setFeedback("");

    startTransition(async () => {
      const result = await createPushCampaign(formData);
      setFeedback(result.message);
      setFeedbackSuccess(result.success);

      if (result.success) {
        const form = document.getElementById("push-campaign-form") as HTMLFormElement | null;
        form?.reset();
        setAudience("ALL");
        setSelected([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold text-slate-900">Create promotional campaign</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only customers with an active, permission-enabled device subscription can receive this campaign.
        </p>

        <form
          id="push-campaign-form"
          action={submitCampaign}
          className="mt-6 space-y-5"
        >
          <div>
            <label htmlFor="campaign-title" className="mb-2 block text-sm font-semibold text-slate-700">
              Notification title
            </label>
            <input
              id="campaign-title"
              name="title"
              required
              maxLength={120}
              placeholder="MooGold special offer"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label htmlFor="campaign-message" className="mb-2 block text-sm font-semibold text-slate-700">
              Message
            </label>
            <textarea
              id="campaign-message"
              name="message"
              required
              maxLength={500}
              rows={4}
              placeholder="Write your promotional message..."
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-xs text-slate-400">Maximum 500 characters.</p>
          </div>

          <div>
            <label htmlFor="campaign-href" className="mb-2 block text-sm font-semibold text-slate-700">
              Destination inside MooGold (optional)
            </label>
            <input
              id="campaign-href"
              name="href"
              maxLength={500}
              placeholder="/dashboard"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-slate-700">Recipients</legend>
            <div className="flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <input
                  type="radio"
                  name="audience-choice"
                  checked={audience === "ALL"}
                  onChange={() => setAudience("ALL")}
                />
                All subscribed customers ({users.length})
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <input
                  type="radio"
                  name="audience-choice"
                  checked={audience === "SELECTED"}
                  onChange={() => setAudience("SELECTED")}
                />
                Select customers
              </label>
            </div>
            <input type="hidden" name="audience" value={audience} />

            {audience === "SELECTED" && (
              <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                {users.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No subscribed customers are available.</p>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          name="targetUserId"
                          value={user.id}
                          checked={selected.includes(user.id)}
                          onChange={() => toggleRecipient(user.id)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-800">{user.name}</span>
                          <span className="text-xs text-slate-500">{user.countryCode || "Country not set"}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {user.deviceCount} device(s)
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
            {audience === "SELECTED" && (
              <p className="mt-2 text-xs text-slate-500">{selected.length} customer(s) selected.</p>
            )}
          </fieldset>

          {feedback && (
            <p
              role="status"
              className={`rounded-xl px-4 py-3 text-sm ${
                feedbackSuccess
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {feedback}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || users.length === 0 || (audience === "SELECTED" && selected.length === 0)}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Creating campaign..." : "Create promotional campaign"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold text-slate-900">Campaign history</h2>
        <p className="mt-1 text-sm text-slate-500">The latest 50 promotional campaigns.</p>

        {campaigns.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No promotional campaigns have been created.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4">Campaign</th>
                  <th className="py-3 pr-4">Audience</th>
                  <th className="py-3 pr-4">Devices</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-4 pr-4 font-semibold text-slate-800">{campaign.title}</td>
                    <td className="py-4 pr-4 text-slate-600">
                      {campaign.audience === "ALL" ? "All subscribed" : "Selected"}
                    </td>
                    <td className="py-4 pr-4 tabular-nums text-slate-600">{campaign.deliveryCount}</td>
                    <td className="py-4 pr-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        campaign.status === "SENT"
                          ? "bg-emerald-50 text-emerald-700"
                          : campaign.status === "PARTIALLY_SENT"
                            ? "bg-amber-50 text-amber-800"
                            : campaign.status === "FAILED"
                              ? "bg-red-50 text-red-700"
                              : campaign.status === "NO_DEVICES"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-50 text-amber-700"
                      }`}>
                        {campaign.status === "SENT"
                          ? "Sent"
                          : campaign.status === "PARTIALLY_SENT"
                            ? "Partially sent"
                            : campaign.status === "FAILED"
                              ? "Failed"
                              : campaign.status === "NO_DEVICES"
                                ? "No devices"
                                : "Queued"}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500">
                      {new Date(campaign.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}