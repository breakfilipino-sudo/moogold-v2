"use client";

import {
  ImagePlus,
  Loader2,
  MessageCircle,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useRef,
  useState,
} from "react";

import { createSupportConversation } from "../actions";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export default function NewSupportForm() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] =
    useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  /*
   * ----------------------------------------------------------
   * IMAGE PREVIEW
   * ----------------------------------------------------------
   *
   * The preview URL is derived directly from the selected
   * file instead of being stored as separate React state.
   *
   * This avoids unnecessary render/effect cycles.
   */
  const previewUrl = attachment
    ? URL.createObjectURL(attachment)
    : null;

  /*
   * ----------------------------------------------------------
   * SELECT IMAGE
   * ----------------------------------------------------------
   */
  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setError("");

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !ACCEPTED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      setError(
        "Please attach a JPG, PNG, WebP, or GIF image.",
      );

      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Images must be 5 MB or smaller.",
      );

      event.target.value = "";
      return;
    }

    setAttachment(file);
  }

  /*
   * ----------------------------------------------------------
   * REMOVE IMAGE
   * ----------------------------------------------------------
   */
  function removeAttachment() {
    setAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /*
   * ----------------------------------------------------------
   * SEND MESSAGE
   * ----------------------------------------------------------
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    const trimmedMessage =
      message.trim();

    if (!trimmedMessage && !attachment) {
      setError(
        "Please enter a message or attach an image.",
      );
      return;
    }

    if (trimmedMessage.length > 5000) {
      setError(
        "Your message is too long.",
      );
      return;
    }

    setSubmitting(true);

    const formData = new FormData();

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

    try {
      const result =
        await createSupportConversation(
          formData,
        );

      if (result.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      if (result.conversationId) {
        router.push(
          `/dashboard/support/${result.conversationId}`,
        );
        router.refresh();
        return;
      }

      setError(
        "We could not start your conversation. Please try again.",
      );
      setSubmitting(false);
    } catch {
      setError(
        "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/70"
    >
      {/* Attachment preview */}
      {attachment && previewUrl && (
        <div className="border-b border-slate-100 px-3 pt-3 dark:border-white/10">
          <div className="relative inline-block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950">
            <Image
              src={previewUrl}
              alt="Attachment preview"
              width={96}
              height={96}
              unoptimized
              className="h-24 w-24 object-cover"
            />

            <button
              type="button"
              onClick={removeAttachment}
              disabled={submitting}
              aria-label="Remove attachment"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mb-2 mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
            {attachment.name}
          </p>
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2 px-3 py-3">
        {/* Attachment input */}
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
          disabled={submitting}
          aria-label="Attach image"
          title="Attach screenshot or image"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-emerald-400"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Message */}
        <div className="min-w-0 flex-1">
          <textarea
            name="message"
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            maxLength={5000}
            rows={1}
            disabled={submitting}
            placeholder="Write a message..."
            className="max-h-32 min-h-9 w-full resize-none border-0 bg-transparent px-1 py-2 text-xs leading-5 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-white dark:placeholder:text-slate-500"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();

                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div className="flex items-center gap-1.5 px-1 pb-0.5">
            <ImagePlus className="h-3 w-3 text-slate-300 dark:text-slate-600" />

            <span className="text-[9px] text-slate-400 dark:text-slate-500">
              You can attach a screenshot or image
            </span>
          </div>
        </div>

        {/* Send */}
        <button
          type="submit"
          disabled={
            submitting ||
            (!message.trim() &&
              !attachment)
          }
          aria-label="Send message"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-[10px] font-medium text-red-600 dark:border-red-500/10 dark:bg-red-500/5 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-2 dark:border-white/10">
        <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-500">
          <MessageCircle className="h-3 w-3" />
          MooGold Customer Service
        </div>
      </div>
    </form>
  );
}