"use client";

import {
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import {
  reopenSupportConversation,
  sendSupportMessage,
} from "../actions";

type Props = {
  conversationId: string;
  status: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const supabase = createClient();

export default function SupportConversationClient({
  conversationId,
  status,
}: Props) {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] =
    useState<File | null>(null);
  const [previewUrl, setPreviewUrl] =
    useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] =
    useState(false);

  const inactive =
    status === "RESOLVED" ||
    status === "CLOSED";

  useEffect(() => {
    if (inactive) {
      return;
    }

    const channel = supabase
      .channel(`support:${conversationId}`)
      .on(
        "broadcast",
        { event: "message" },
        () => {
          router.refresh();
        },
      )
      .on(
        "broadcast",
        { event: "conversation" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    conversationId,
    inactive,
    router,
  ]);

  useEffect(() => {
    if (!sending && !inactive) {
      textareaRef.current?.focus();
    }
  }, [sending, inactive]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        "Please choose a JPG, PNG, WebP, or GIF image.",
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Images must be 5MB or smaller.",
      );

      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setAttachment(file);
    setPreviewUrl(
      URL.createObjectURL(file),
    );

    event.target.value = "";
  }

  function removeAttachment() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setAttachment(null);
    setPreviewUrl("");
  }

  async function handleSubmit(
    event?: React.FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    if (sending || inactive) {
      return;
    }

    const trimmedMessage =
      message.trim();

    if (!trimmedMessage && !attachment) {
      return;
    }

    setError("");
    setSending(true);

    try {
      const formData = new FormData();

      formData.set(
        "conversationId",
        conversationId,
      );

      formData.set(
        "message",
        trimmedMessage,
      );

      if (attachment) {
        formData.set(
          "attachment",
          attachment,
        );
      }

      const result =
        await sendSupportMessage(
          formData,
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage("");
      removeAttachment();

      router.refresh();
    } catch {
      setError(
        "We could not send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void handleSubmit();
    }
  }

  async function handleReopen() {
    setError("");
    setReopening(true);

    try {
      const result =
        await reopenSupportConversation(
          conversationId,
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setError(
        "We could not reopen this conversation. Please try again.",
      );
    } finally {
      setReopening(false);
    }
  }

  if (inactive) {
    return (
      <div className="border-t border-slate-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-950/30 sm:px-5 sm:py-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                Conversation closed
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                If you still need help with this
                issue, you can reopen the conversation.
              </p>

              {error && (
                <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleReopen}
                disabled={reopening}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-[10px] font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reopening && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}

                Reopen conversation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-100 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-950/40 sm:px-5 sm:py-4"
    >
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[10px] font-semibold text-red-600 dark:border-red-500/10 dark:bg-red-500/10 dark:text-red-400">
          <span className="flex-1">
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="shrink-0 rounded-md p-0.5 opacity-70 transition hover:bg-red-100 hover:opacity-100 dark:hover:bg-red-500/10"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {attachment && previewUrl && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={attachment.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
              {attachment.name}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {formatFileSize(
                attachment.size,
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={removeAttachment}
            disabled={sending}
            aria-label="Remove attachment"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={sending}
          aria-label="Attach image"
          title="Attach image"
          className="flex h-11 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-400 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) =>
            setMessage(event.target.value)
          }
          onKeyDown={handleKeyDown}
          maxLength={5000}
          rows={2}
          disabled={sending}
          placeholder="Write a message..."
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-950"
        />

        <button
          type="submit"
          disabled={
            sending ||
            (!message.trim() &&
              !attachment)
          }
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-2 px-1 text-[9px] text-slate-400">
        JPG, PNG, WebP or GIF · Max 5MB
      </div>
    </form>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}