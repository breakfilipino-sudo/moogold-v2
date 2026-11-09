import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import PushCampaignManager from "./push-campaign-manager";

export const dynamic = "force-dynamic";

export default async function AdminPushNotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
    select: { role: true },
  });

  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const [users, campaigns] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "USER",
        accountStatus: "ACTIVE",
        pushSubscriptions: { some: { revokedAt: null } },
      },
      select: {
        id: true,
        fullName: true,
        countryCode: true,
        pushSubscriptions: {
          where: { revokedAt: null },
          select: { id: true },
        },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.pushCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        audience: true,
        status: true,
        createdAt: true,
        sentAt: true,
        _count: { select: { deliveries: true } },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <a
            href="/admin"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ← Admin Dashboard
          </a>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            Push Notifications
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create and manage promotional notifications for customers who have enabled phone notifications.
          </p>
        </div>

        <PushCampaignManager
          users={users.map((user) => ({
            id: user.id,
            name: user.fullName?.trim() || "MooGold customer",
            countryCode: user.countryCode,
            deviceCount: user.pushSubscriptions.length,
          }))}
          campaigns={campaigns.map((campaign) => ({
            id: campaign.id,
            title: campaign.title,
            audience: campaign.audience,
            status: campaign.status,
            createdAt: campaign.createdAt.toISOString(),
            sentAt: campaign.sentAt?.toISOString() ?? null,
            deliveryCount: campaign._count.deliveries,
          }))}
        />
      </div>
    </main>
  );
}