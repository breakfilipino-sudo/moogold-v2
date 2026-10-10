import Link from "next/link";
import {
  ChevronRight,
  MessageCircle,
  Plus,
} from "lucide-react";
import { redirect } from "next/navigation";

import {
  SupportConversationStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

function formatTime(date: Date | null) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date | null) {
  if (!date) return "";

  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return formatTime(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getStatusLabel(
  status: SupportConversationStatus,
) {
  switch (status) {
    case SupportConversationStatus.OPEN:
      return "Active";

    case SupportConversationStatus.PENDING:
      return "Waiting for reply";

    case SupportConversationStatus.RESOLVED:
      return "Resolved";

    case SupportConversationStatus.CLOSED:
      return "Closed";

    default:
      return "";
  }
}

function getStatusClass(
  status: SupportConversationStatus,
) {
  switch (status) {
    case SupportConversationStatus.OPEN:
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";

    case SupportConversationStatus.PENDING:
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    default:
      return "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400";
  }
}

export default async function SupportPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      authUserId: authUser.id,
    },
    select: {
      id: true,
      fullName: true,
      accountStatus: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.accountStatus !== "ACTIVE") {
    redirect("/login?closed=1");
  }

  const conversations =
    await prisma.supportConversation.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [
        {
          lastMessageAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 20,
      select: {
        id: true,
        subject: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        messages: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            body: true,
            senderType: true,
            createdAt: true,
          },
        },
      },
    });

  const activeConversation = conversations.find(
    (conversation) =>
      conversation.status ===
        SupportConversationStatus.OPEN ||
      conversation.status ===
        SupportConversationStatus.PENDING,
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col px-3 py-4 sm:px-5 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <MessageCircle className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                MooGold
              </p>

              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Customer Service
              </h1>

              {activeConversation && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Conversation active
                  </span>
                </div>
              )}
            </div>
          </div>

          <Link
            href="/dashboard/support/new"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Link>
        </div>

        {/* Intro */}
        <div className="border-b border-slate-200 py-5 dark:border-white/10">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            How can we help?
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Chat directly with MooGold Customer Service about your
            account, payments, transactions, or anything else you
            need help with.
          </p>
        </div>

        {/* Start chat */}
        {!activeConversation && (
          <Link
            href="/dashboard/support/new"
            className="group mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50/30 dark:border-white/10 dark:bg-slate-900/50 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/[0.03]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <MessageCircle className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Start a conversation
              </p>

              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Send a message to Customer Service
              </p>
            </div>

            <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500" />
          </Link>
        )}

        {/* Conversations */}
        {conversations.length > 0 && (
          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                {activeConversation
                  ? "Your conversations"
                  : "Previous conversations"}
              </h2>

              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {conversations.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/50">
              {conversations.map(
                (conversation, index) => {
                  const latestMessage =
                    conversation.messages[0];

                  const isActive =
                    conversation.id ===
                    activeConversation?.id;

                  return (
                    <Link
                      key={conversation.id}
                      href={`/dashboard/support/${conversation.id}`}
                      className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03] ${
                        index > 0
                          ? "border-t border-slate-100 dark:border-white/10"
                          : ""
                      } ${
                        isActive
                          ? "bg-emerald-50/30 dark:bg-emerald-500/[0.02]"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                            {conversation.subject}
                          </p>

                          <span
                            className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold sm:inline-flex ${getStatusClass(
                              conversation.status,
                            )}`}
                          >
                            {getStatusLabel(
                              conversation.status,
                            )}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {latestMessage?.body ??
                            "No messages yet"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {formatDate(
                            latestMessage?.createdAt ??
                              conversation.lastMessageAt ??
                              conversation.createdAt,
                          )}
                        </span>

                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-emerald-500" />
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-[10px] leading-5 text-slate-400 dark:text-slate-500">
            Customer Service conversations are private to your
            MooGold account.
          </p>
        </div>
      </div>
    </div>
  );
}