"use client";

import {
useEffect,
useMemo,
useRef,
useState,
type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
AlertCircle,
ChevronDown,
ImagePlus,
Loader2,
MessageCircle,
Paperclip,
Search,
Send,
UserRound,
X,
} from "lucide-react";

import {
sendAdminSupportMessage,
updateSupportConversation,
} from "./actions";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
"image/jpeg",
"image/png",
"image/webp",
"image/gif",
]);

type ConversationListItem = {
id: string;
reference: string;
subject: string;
category: string;
status: string;
priority: string;
lastMessageAt: Date | null;
createdAt: Date;
assignedAdminId: string | null;
assignedAdmin: {
  id: string;
  fullName: string | null;
} | null;

user: {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
};
messages: {
id: string;
body: string;
senderType: string;
createdAt: Date;
attachments: {
id: string;
}[];
}[];
};

type SupportAdmin = {
  id: string;
  fullName: string | null;
};

type SelectedConversation = {
id: string;
reference: string;
subject: string;
category: string;
status: string;
priority: string;
assignedAdminId: string | null;
lastMessageAt: Date | null;
createdAt: Date;
user: {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  countryCode: string | null;
};
assignedAdmin: {
  id: string;
  fullName: string | null;
} | null;
messages: {
id: string;
body: string;
senderType: string;
createdAt: Date;
author: {
  id: string;
  fullName: string | null;
  role: string;
};
attachments: {
id: string;
fileName: string;
mimeType: string;
fileSize: number;
createdAt: Date;
}[];
}[];
};

type Props = {
conversations: ConversationListItem[];
supportAdmins: SupportAdmin[];
selectedConversation: SelectedConversation | null;
adminId: string;
};

function formatTime(date: Date | string) {
return new Intl.DateTimeFormat(undefined, {
hour: "numeric",
minute: "2-digit",
}).format(new Date(date));
}

function formatDate(date: Date | string) {
return new Intl.DateTimeFormat(undefined, {
month: "short",
day: "numeric",
year: "numeric",
}).format(new Date(date));
}

function formatBytes(bytes: number) {
if (bytes < 1024 * 1024) {
return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getInitials(name: string | null) {
  return (name || "Customer")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusLabel(status: string) {
switch (status) {
case "OPEN":
return "Open";
case "PENDING":
return "Pending";
case "RESOLVED":
return "Resolved";
case "CLOSED":
return "Closed";
default:
return status;
}
}

function priorityLabel(priority: string) {
switch (priority) {
case "LOW":
return "Low";
case "NORMAL":
return "Normal";
case "HIGH":
return "High";
case "URGENT":
return "Urgent";
default:
return priority;
}
}

export default function AdminSupportWorkspace({
conversations,
supportAdmins,
selectedConversation,
adminId,
}: Props) {
const [search, setSearch] = useState("");

const filteredConversations = useMemo(() => {
const query = search.trim().toLowerCase();

if (!query) {
  return conversations;
}

return conversations.filter((conversation) => {
  return (
    (conversation.user.fullName || "Customer")
  .toLowerCase()
      .includes(query) ||
    conversation.reference
      .toLowerCase()
      .includes(query) ||
    conversation.user.phone
      ?.toLowerCase()
      .includes(query) ||
    conversation.user.email
      ?.toLowerCase()
      .includes(query)
  );
});

}, [conversations, search]);

return ( <div className="grid min-h-[calc(100vh-145px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_minmax(0,1fr)]">
{/* Conversation list */} <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r"> <div className="border-b border-slate-200 bg-white p-4"> <div className="flex items-center justify-between"> <div> <p className="text-sm font-black text-slate-900">
Conversations </p>

          <p className="mt-0.5 text-xs text-slate-500">
            {conversations.length} total
          </p>
        </div>

        <MessageCircle className="h-5 w-5 text-emerald-600" />
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customers..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
      </div>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto">
      {filteredConversations.length === 0 ? (
        <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
          <MessageCircle className="h-8 w-8 text-slate-300" />

          <p className="mt-3 text-sm font-bold text-slate-600">
            No conversations
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Customer conversations will appear here.
          </p>
        </div>
      ) : (
        filteredConversations.map((conversation) => {
          const isSelected =
            conversation.id === selectedConversation?.id;

          const lastMessage = conversation.messages[0];

          const customerWaiting =
            lastMessage?.senderType === "CUSTOMER" &&
            conversation.status !== "CLOSED" &&
            conversation.status !== "RESOLVED";

          return (
            <Link
              key={conversation.id}
              href={`/admin/support?conversation=${conversation.id}`}
              className={`block border-b border-slate-200 px-4 py-4 transition ${
                isSelected
                  ? "bg-emerald-50/70"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {getInitials(conversation.user.fullName)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {conversation.user.fullName || "Customer"}
                    </p>

                    {conversation.lastMessageAt && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                    {conversation.reference}
                  </p>

                  <p
                    className={`mt-2 line-clamp-1 text-xs ${
                      customerWaiting
                        ? "font-bold text-slate-700"
                        : "text-slate-500"
                    }`}
                  >
                    {lastMessage?.body ||
                      (lastMessage?.attachments.length
                        ? "Image attachment"
                        : "No message")}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {statusLabel(conversation.status)}
                    </span>

                    {conversation.priority !== "NORMAL" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          conversation.priority === "URGENT"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {priorityLabel(conversation.priority)}
                      </span>
                    )}

                    {customerWaiting && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Customer waiting
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  </aside>

  {/* Conversation panel is keyed so conversation-specific state
      is naturally reset when the selected conversation changes. */}
  <AdminSupportConversationPanel
    key={selectedConversation?.id ?? "empty"}
    selectedConversation={selectedConversation}
    supportAdmins={supportAdmins}
    adminId={adminId}
  />
</div>

);
}

function AdminSupportConversationPanel({
selectedConversation,
supportAdmins,
adminId,
}: {
selectedConversation: SelectedConversation | null;
supportAdmins: SupportAdmin[];
adminId: string;
}) {
const [message, setMessage] = useState("");

const [attachment, setAttachment] = useState<File | null>(null);

const [sending, setSending] = useState(false);

const [updating, setUpdating] = useState(false);

const [error, setError] = useState<string | null>(null);

const [showCustomerDetails, setShowCustomerDetails] =
useState(false);

const [status, setStatus] = useState(
selectedConversation?.status ?? "OPEN",
);

const [priority, setPriority] = useState(
selectedConversation?.priority ?? "NORMAL",
);

const [assignedAdminId, setAssignedAdminId] = useState(
selectedConversation?.assignedAdminId ?? "",
);

const fileInputRef = useRef<HTMLInputElement>(null);

const messagesEndRef = useRef<HTMLDivElement>(null);

const previewUrl = useMemo(() => {
if (!attachment) {
return null;
}

return URL.createObjectURL(attachment);

}, [attachment]);

useEffect(() => {
if (!previewUrl) {
return;
}

return () => {
  URL.revokeObjectURL(previewUrl);
};

}, [previewUrl]);

useEffect(() => {
messagesEndRef.current?.scrollIntoView({
behavior: "smooth",
});
}, [selectedConversation?.messages.length]);

useEffect(() => {
if (!selectedConversation?.id) {
return;
}

const channel = supabase.channel(
  `support:${selectedConversation.id}`,
);

channel
  .on(
    "broadcast",
    {
      event: "message",
    },
    () => {
      window.location.reload();
    },
  )
  .on(
    "broadcast",
    {
      event: "conversation",
    },
    () => {
      window.location.reload();
    },
  )
  .subscribe();

return () => {
  void supabase.removeChannel(channel);
};

}, [selectedConversation?.id]);

function handleAttachmentChange(file: File | undefined) {
if (!file) {
return;
}

setError(null);

if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
  setError(
    "Only JPG, PNG, WebP, and GIF images are supported.",
  );
  return;
}

if (file.size > MAX_ATTACHMENT_SIZE) {
  setError("Images must be 5 MB or smaller.");
  return;
}

setAttachment(file);

}

function removeAttachment() {
setAttachment(null);

if (fileInputRef.current) {
  fileInputRef.current.value = "";
}

}

async function handleSend() {
if (sending || !selectedConversation) {
return;
}

if (!message.trim() && !attachment) {
  return;
}

setSending(true);
setError(null);

const formData = new FormData();

formData.set(
  "conversationId",
  selectedConversation.id,
);

formData.set("message", message);

if (attachment) {
  formData.set("attachment", attachment);
}

const result = await sendAdminSupportMessage(formData);

if (result.error) {
  setError(result.error);
  setSending(false);
  return;
}

setMessage("");
removeAttachment();
setSending(false);

window.location.reload();

}

async function handleConversationUpdate(
nextStatus: string,
nextPriority: string,
nextAssignedAdminId: string,
) {
if (!selectedConversation || updating) {
return;
}

setUpdating(true);
setError(null);

const formData = new FormData();

formData.set(
  "conversationId",
  selectedConversation.id,
);

formData.set("status", nextStatus);

formData.set("priority", nextPriority);

formData.set(
  "assignedAdminId",
  nextAssignedAdminId,
);

const result = await updateSupportConversation(formData);

if (result.error) {
  setError(result.error);
  setUpdating(false);
  return;
}

setStatus(nextStatus);
setPriority(nextPriority);
setAssignedAdminId(nextAssignedAdminId);

setUpdating(false);

window.location.reload();

}

function handleComposerKeyDown(
event: KeyboardEvent<HTMLTextAreaElement>,
) {
if (
event.key === "Enter" &&
!event.shiftKey
) {
event.preventDefault();
void handleSend();
}
}

if (!selectedConversation) {
return ( <section className="flex min-h-0 min-w-0 flex-col bg-white"> <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"> <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"> <MessageCircle className="h-7 w-7 text-emerald-600" /> </div>

      <h2 className="mt-5 text-lg font-black text-slate-900">
        Customer Service
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        Select a customer conversation to view the chat and
        respond.
      </p>
    </div>
  </section>
);

}

return ( <section className="flex min-h-0 min-w-0 flex-col bg-white">
{/* Chat header */} <div className="border-b border-slate-200 bg-white px-5 py-4"> <div className="flex flex-wrap items-center justify-between gap-4"> <div className="flex min-w-0 items-center gap-3"> <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
{getInitials(selectedConversation.user.fullName)} </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-black text-slate-900">
              {selectedConversation.user.fullName || "Customer"}
            </h2>

            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Customer
            </span>
          </div>

          <p className="mt-0.5 text-xs text-slate-400">
            {selectedConversation.reference}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          setShowCustomerDetails((value) => !value)
        }
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
      >
        <UserRound className="h-3.5 w-3.5" />
        Customer details

        <ChevronDown
          className={`h-3.5 w-3.5 transition ${
            showCustomerDetails ? "rotate-180" : ""
          }`}
        />
      </button>
    </div>

    {showCustomerDetails && (
      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Phone
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            {selectedConversation.user.phone ||
              "Not provided"}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Email
          </p>

          <p className="mt-1 break-all text-xs font-semibold text-slate-700">
            {selectedConversation.user.email ||
              "Not provided"}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Country
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            {selectedConversation.user.countryCode ||
  "Not provided"}
          </p>
        </div>
      </div>
    )}
  </div>

  {/* Admin controls */}
  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
    <select
      value={status}
      disabled={updating}
      onChange={(event) => {
        const next = event.target.value;

        setStatus(next);

        void handleConversationUpdate(
          next,
          priority,
          assignedAdminId,
        );
      }}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
    >
      <option value="OPEN">Open</option>
      <option value="PENDING">Pending</option>
      <option value="RESOLVED">Resolved</option>
      <option value="CLOSED">Closed</option>
    </select>

    <select
      value={priority}
      disabled={updating}
      onChange={(event) => {
        const next = event.target.value;

        setPriority(next);

        void handleConversationUpdate(
          status,
          next,
          assignedAdminId,
        );
      }}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
    >
      <option value="LOW">Low priority</option>
      <option value="NORMAL">Normal priority</option>
      <option value="HIGH">High priority</option>
      <option value="URGENT">Urgent priority</option>
    </select>

    <select
      value={assignedAdminId}
      disabled={updating}
      onChange={(event) => {
        const next = event.target.value;

        setAssignedAdminId(next);

        void handleConversationUpdate(
          status,
          priority,
          next,
        );
      }}
      className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
    >
      <option value="">Unassigned</option>

      {supportAdmins.map((supportAdmin) => (
        <option
          key={supportAdmin.id}
          value={supportAdmin.id}
        >
          {supportAdmin.id === adminId
  ? `${supportAdmin.fullName || "Administrator"} (You)`
  : supportAdmin.fullName || "Administrator"}
        </option>
      ))}
    </select>

    {updating && (
      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
    )}
  </div>

  {/* Messages */}
  <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-5">
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <div className="mb-3 text-center">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-400">
          Conversation started{" "}
          {formatDate(selectedConversation.createdAt)}
        </span>
      </div>

      {selectedConversation.messages.map((item) => {
        const isCustomer =
          item.senderType === "CUSTOMER";

        const isSystem =
          item.senderType === "SYSTEM";

        if (isSystem) {
          return (
            <div
              key={item.id}
              className="flex justify-center py-1"
            >
              <span className="max-w-md rounded-full bg-slate-100 px-4 py-2 text-center text-[11px] font-medium text-slate-500">
                {item.body}
              </span>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className={`flex ${
              isCustomer
                ? "justify-start"
                : "justify-end"
            }`}
          >
            <div
              className={`max-w-[78%] ${
                isCustomer
                  ? "items-start"
                  : "items-end"
              } flex flex-col`}
            >
              <div
                className={`rounded-2xl px-4 py-3 ${
                  isCustomer
                    ? "rounded-tl-md bg-slate-100 text-slate-800"
                    : "rounded-tr-md bg-emerald-600 text-white"
                }`}
              >
                {item.body && (
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {item.body}
                  </p>
                )}

                {item.attachments.length > 0 && (
                  <div
                    className={`${
                      item.body ? "mt-3" : "mt-0"
                    } flex flex-col gap-2`}
                  >
                    {item.attachments.map((file) => (
                      <AdminSupportAttachment
                        key={file.id}
                        attachmentId={file.id}
                        fileName={file.fileName}
                        fileSize={file.fileSize}
                        isCustomer={isCustomer}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-slate-400">
                <span>
                  {isCustomer
  ? item.author.fullName || "Customer"
  : "MooGold Customer Service"}
                </span>

                <span>·</span>

                <span>
                  {formatTime(item.createdAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  </div>

  {/* Error */}
  {error && (
    <div className="border-t border-red-100 bg-red-50 px-5 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-2 text-xs font-semibold text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />

        <span>{error}</span>

        <button
          type="button"
          onClick={() => setError(null)}
          className="ml-auto"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )}

  {/* Composer */}
  <div className="border-t border-slate-200 bg-white p-4">
    {attachment && (
      <div className="mx-auto mb-3 flex max-w-4xl items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200">
            <ImagePlus className="h-5 w-5 text-slate-500" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-700">
            {attachment.name}
          </p>

          <p className="text-[10px] text-slate-400">
            {formatBytes(attachment.size)}
          </p>
        </div>

        <button
          type="button"
          onClick={removeAttachment}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
          aria-label="Remove attachment"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )}

    <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) =>
          handleAttachmentChange(
            event.target.files?.[0],
          )
        }
      />

      <button
        type="button"
        onClick={() =>
          fileInputRef.current?.click()
        }
        disabled={sending}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600 disabled:opacity-50"
        aria-label="Attach image"
      >
        <Paperclip className="h-5 w-5" />
      </button>

      <textarea
        value={message}
        onChange={(event) =>
          setMessage(event.target.value)
        }
        onKeyDown={handleComposerKeyDown}
        rows={1}
        maxLength={5000}
        disabled={sending}
        placeholder="Reply to the customer..."
        className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={
          sending ||
          (!message.trim() && !attachment)
        }
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Send message"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>

    <div className="mx-auto mt-2 flex max-w-4xl items-center justify-between px-1">
      <p className="text-[10px] text-slate-400">
        Enter to send · Shift + Enter for a new line
      </p>

      <p className="text-[10px] text-slate-400">
        Images up to 5 MB
      </p>
    </div>
  </div>
</section>

);
}

function AdminSupportAttachment({
attachmentId,
fileName,
fileSize,
isCustomer,
}: {
attachmentId: string;
fileName: string;
fileSize: number;
isCustomer: boolean;
}) {
const [url, setUrl] = useState<string | null>(null);

const [loading, setLoading] = useState(true);

const [error, setError] = useState(false);

useEffect(() => {
let active = true;

async function load() {
  const {
    getAdminSupportAttachmentUrl,
  } = await import("./actions");

  const result =
    await getAdminSupportAttachmentUrl(
      attachmentId,
    );

  if (!active) {
    return;
  }

  if (result.success && result.url) {
    setUrl(result.url);
  } else {
    setError(true);
  }

  setLoading(false);
}

void load();

return () => {
  active = false;
};

}, [attachmentId]);

if (loading) {
return ( <div className="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-xs"> <Loader2 className="h-4 w-4 animate-spin" />
Loading image... </div>
);
}

if (error || !url) {
return ( <div className="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-xs"> <AlertCircle className="h-4 w-4" />
Attachment unavailable </div>
);
}

return ( <a
   href={url}
   target="_blank"
   rel="noreferrer"
   className="block overflow-hidden rounded-xl"
 > <Image
     src={url}
     alt={fileName}
     width={640}
     height={480}
     unoptimized
     className="max-h-64 max-w-full rounded-xl object-contain"
   />

  <div
    className={`mt-1 text-[10px] ${
      isCustomer
        ? "text-slate-400"
        : "text-emerald-100"
    }`}
  >
    {fileName} · {formatBytes(fileSize)}
  </div>
</a>

);
}
