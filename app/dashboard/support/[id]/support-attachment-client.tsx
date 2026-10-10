"use client";

import {
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { getSupportAttachmentUrl } from "../actions";

type Props = {
  attachmentId: string;
  fileName: string;
};

export default function SupportAttachmentClient({
  attachmentId,
  fileName,
}: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAttachment() {
      setLoading(true);
      setError("");

      try {
        const result =
          await getSupportAttachmentUrl(
            attachmentId,
          );

        if (cancelled) {
          return;
        }

        if (result.error || !result.url) {
          setError(
            result.error ??
              "Unable to open this image.",
          );
          return;
        }

        setUrl(result.url);
      } catch {
        if (!cancelled) {
          setError(
            "Unable to open this image.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAttachment();

    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="mt-2 flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * ERROR
   * ----------------------------------------------------------
   */
  if (error || !url) {
    return (
      <div className="mt-2 flex max-w-[240px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-slate-400" />

        <span className="min-w-0 truncate text-[10px] text-slate-500 dark:text-slate-400">
          {fileName}
        </span>

        <X className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * IMAGE
   * ----------------------------------------------------------
   */
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mt-2 block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left transition hover:border-emerald-300 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-emerald-500/30"
        aria-label={`Open ${fileName}`}
      >
        <div className="relative max-h-64 max-w-[280px] overflow-hidden sm:max-w-[340px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={fileName}
            className="block max-h-64 w-auto max-w-full object-contain transition duration-200 group-hover:scale-[1.01]"
          />
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-2.5 py-2 dark:border-white/10 dark:bg-slate-950/60">
          <ImageIcon className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />

          <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-slate-500 dark:text-slate-400">
            {fileName}
          </span>

          <span className="text-[9px] text-slate-400">
            View
          </span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={fileName}
        >
          <div
            className="relative flex max-h-[90vh] max-w-[92vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <ImageIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                {fileName}
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close image"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex max-h-[calc(90vh-56px)] items-center justify-center overflow-auto bg-slate-100 p-3 dark:bg-black/30 sm:p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={fileName}
                className="max-h-[calc(90vh-90px)] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}