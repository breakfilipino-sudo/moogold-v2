import {
  CheckCircle2,
  Clock3,
  MessageCircle,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import {
  SupportConversationStatus,
  SupportSenderType,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import SupportAttachmentClient from "./support-attachment-client";
import SupportBackButton from "./support-back-button";
import SupportConversationClient from "./support-conversation-client";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatMessageTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDay(date: Date) {
  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === now.getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

function isSameDay(
  first: Date,
  second: Date,
) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export default async function SupportConversationPage({
  params,
}: PageProps) {
  const { id } = await params;

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

  const conversation =
    await prisma.supportConversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        lastMessageAt: true,
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            authorId: true,
            senderType: true,
            body: true,
            createdAt: true,
            attachments: {
              orderBy: {
                createdAt: "asc",
              },
              select: {
                id: true,
                fileName: true,
                mimeType: true,
                fileSize: true,
              },
            },
          },
        },
      },
    });

  if (!conversation) {
    notFound();
  }

  const isConversationActive =
    conversation.status !==
      SupportConversationStatus.RESOLVED &&
    conversation.status !==
      SupportConversationStatus.CLOSED;

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col px-3 py-3 sm:px-5 sm:py-5">
        <SupportBackButton />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-slate-900/80 dark:shadow-none">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-slate-900/80 sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <MessageCircle className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-black text-slate-900 dark:text-white">
                  MooGold Customer Service
                </h1>
              </div>

              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isConversationActive
                      ? "bg-emerald-500"
                      : "bg-slate-400"
                  }`}
                />

                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {isConversationActive
                    ? "Online"
                    : conversation.status ===
                        SupportConversationStatus.RESOLVED
                      ? "Conversation resolved"
                      : "Conversation closed"}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-3 py-4 dark:bg-slate-950/20 sm:px-5 sm:py-5"
            id="support-messages"
          >
            {conversation.messages.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="max-w-xs text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <MessageCircle className="h-5 w-5" />
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">
                    Start your conversation
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                    Send a message below and our support team will get back to you.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-3">
                {conversation.messages.map(
                  (message, index) => {
                    const previousMessage =
                      conversation.messages[index - 1];

                    const showDay =
                      !previousMessage ||
                      !isSameDay(
                        previousMessage.createdAt,
                        message.createdAt,
                      );

                    const isCustomer =
                      message.senderType ===
                      SupportSenderType.CUSTOMER;

                    const isSystem =
                      message.senderType ===
                      SupportSenderType.SYSTEM;

                    return (
                      <div key={message.id}>
                        {showDay && (
                          <div className="my-5 flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />

                            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-slate-400 shadow-sm dark:bg-white/[0.04] dark:text-slate-500">
                              {formatDay(
                                message.createdAt,
                              )}
                            </span>

                            <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                          </div>
                        )}

                        {isSystem ? (
                          <div className="flex justify-center py-1">
                            <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-medium text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                              {message.body}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`flex ${
                              isCustomer
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`flex max-w-[88%] flex-col ${
                                isCustomer
                                  ? "items-end"
                                  : "items-start"
                              } sm:max-w-[75%]`}
                            >
                              {(message.body ||
                                message.attachments.length >
                                  0) && (
                                <div
                                  className={`overflow-hidden rounded-2xl text-xs leading-5 shadow-sm ${
                                    isCustomer
                                      ? "rounded-br-md bg-emerald-600 text-white"
                                      : "rounded-bl-md border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
                                  }`}
                                >
                                  {message.body && (
                                    <div className="whitespace-pre-wrap px-3.5 py-3">
                                      {message.body}
                                    </div>
                                  )}

                                  {message.attachments
                                    .length >
                                    0 && (
                                    <div
                                      className={
                                        message.body
                                          ? "border-t border-black/5 dark:border-white/10"
                                          : ""
                                      }
                                    >
                                      {message.attachments.map(
                                        (
                                          attachment,
                                        ) => (
                                          <div
                                            key={
                                              attachment.id
                                            }
                                            className="p-2"
                                          >
                                            <SupportAttachment
                                              attachmentId={
                                                attachment.id
                                              }
                                              fileName={
                                                attachment.fileName
                                              }
                                            />
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              <span className="mt-1.5 px-1 text-[9px] font-medium text-slate-400 dark:text-slate-500">
                                {isCustomer
                                  ? "You"
                                  : "Customer Service"}{" "}
                                •{" "}
                                {formatMessageTime(
                                  message.createdAt,
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          <SupportConversationClient
            conversationId={conversation.id}
            status={conversation.status}
          />

          {/* Conversation footer */}
          <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-slate-100 bg-white px-4 py-2.5 text-[9px] text-slate-400 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-500">
            {conversation.status ===
            SupportConversationStatus.RESOLVED ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                This conversation has been resolved.
              </>
            ) : conversation.status ===
              SupportConversationStatus.CLOSED ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                This conversation is closed.
              </>
            ) : (
              <>
                <Clock3 className="h-3 w-3" />
                Messages are saved securely to your account.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportAttachment({
  attachmentId,
  fileName,
}: {
  attachmentId: string;
  fileName: string;
}) {
  return (
    <SupportAttachmentClient
      attachmentId={attachmentId}
      fileName={fileName}
    />
  );
}