import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

function money(value: string, currency: string) {
  const amount = Number(value);
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminLoansPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { role: true },
  });

  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const [pendingCount, approvedCount, rejectedCount, applications] =
    await Promise.all([
      prisma.regularLoanApplication.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.regularLoanApplication.count({ where: { status: "APPROVED" } }),
      prisma.regularLoanApplication.count({ where: { status: "REJECTED" } }),
      prisma.regularLoanApplication.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          loanType: true,
          status: true,
          currency: true,
          requestedAmount: true,
          termMonths: true,
          createdAt: true,
          user: {
            select: { fullName: true, email: true, phone: true },
          },
          documents: { select: { id: true } },
        },
      }),
    ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← Admin dashboard
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Lending operations
            </p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Regular loan applications</h1>
            <p className="mt-2 text-sm text-slate-600">
              Review applications and documents before making a loan offer.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
            {pendingCount} awaiting review
          </span>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            ["Awaiting review", pendingCount],
            ["Offers issued", approvedCount],
            ["Rejected", rejectedCount],
          ].map(([label, count]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{count}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">Recent applications</h2>
          </div>

          {applications.length === 0 ? (
            <p className="p-8 text-sm text-slate-500">No loan applications have been submitted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Requested</th>
                    <th className="px-5 py-3">Term</th>
                    <th className="px-5 py-3">Documents</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {application.user.fullName || "Name unavailable"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {application.user.email || application.user.phone || "No contact listed"}
                        </p>
                      </td>
                      <td className="px-5 py-4">{application.loanType}</td>
                      <td className="px-5 py-4 font-semibold">
                        {money(application.requestedAmount.toString(), application.currency)}
                      </td>
                      <td className="px-5 py-4">{application.termMonths} months</td>
                      <td className="px-5 py-4">{application.documents.length}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {statusLabel(application.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/loans/${application.id}`}
                          className="font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}