import {
  getAdminSupportConversation,
  getAdminSupportWorkspace,
} from "./actions";
import AdminSupportWorkspace from "./admin-support-workspace";

type AdminSupportPageProps = {
  searchParams: Promise<{
    conversation?: string;
  }>;
};

export default async function AdminSupportPage({
  searchParams,
}: AdminSupportPageProps) {
  const params = await searchParams;

  const workspace =
    await getAdminSupportWorkspace();

  const selectedConversationId =
    params.conversation ||
    workspace.conversations[0]?.id ||
    null;

  const selectedConversation =
    selectedConversationId
      ? await getAdminSupportConversation(
          selectedConversationId,
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              MooGold Administration
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Customer Service
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage customer conversations and provide support.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Support online
          </div>
        </div>

        <AdminSupportWorkspace
          conversations={workspace.conversations}
          supportAdmins={workspace.supportAdmins}
          selectedConversation={
            selectedConversation
          }
          adminId={workspace.adminId}
        />
      </div>
    </div>
  );
}