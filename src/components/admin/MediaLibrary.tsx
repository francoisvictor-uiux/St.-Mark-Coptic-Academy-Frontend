"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import {
  deleteMedia,
  listMedia,
  updateMedia,
  uploadMedia,
  type MediaAsset,
} from "@/lib/content-api";
import { SpinnerIcon } from "@/components/auth/icons";
import { cursorFrom, EmptyState, ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

type MediaLibraryProps = {
  /** picker → clicking an image selects it instead of opening details. */
  mode?: "screen" | "picker";
  onPick?: (asset: MediaAsset) => void;
};

export default function MediaLibrary({ mode = "screen", onPick }: MediaLibraryProps) {
  const t = useTranslations("admin.media");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(0);
  const [detail, setDetail] = useState<MediaAsset | null>(null);
  const [altAr, setAltAr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(
    async (opts: { cursor?: string; append?: boolean } = {}) => {
      if (!opts.append) setState("loading");
      try {
        const page = await listMedia({ q: q.trim() || undefined, cursor: opts.cursor });
        setAssets((prev) => (opts.append ? [...prev, ...page.results] : page.results));
        setNext(page.next);
        setState("ready");
      } catch {
        if (!opts.append) setState("error");
      }
    },
    [q],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [load]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(files.length);
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const asset = await uploadMedia(file);
        setAssets((prev) => [asset, ...prev]);
      } catch (error) {
        failed += 1;
        toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.upload"));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (failed === 0) toast("success", t("uploaded", { count: files.length }));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveAlt() {
    if (!detail) return;
    setBusy(true);
    try {
      const updated = await updateMedia(detail.id, { alt_ar: altAr });
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast("success", t("altSaved"));
      setDetail(null);
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setBusy(false);
    }
  }

  async function removeAsset() {
    if (!detail) return;
    setBusy(true);
    try {
      await deleteMedia(detail.id);
      setAssets((prev) => prev.filter((a) => a.id !== detail.id));
      toast("success", t("deleted"));
      setDetail(null);
      setConfirmDelete(false);
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setBusy(false);
    }
  }

  const canUpload = can(me, "media.create");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full max-w-xs rounded-xl border border-line bg-creamy-50 px-4 text-[13.5px] placeholder:text-brown-200 focus:border-brown-400 focus:outline-none"
        />
        {canUpload ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading > 0}
              className="inline-flex items-center gap-2 rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600 disabled:opacity-60"
            >
              {uploading > 0 ? <SpinnerIcon className="size-4" /> : null}
              {uploading > 0 ? t("uploading", { count: uploading }) : t("upload")}
            </button>
          </>
        ) : null}
      </div>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={() => load()} retryLabel={t("retry")} />
      ) : state === "loading" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-creamy-400" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState text={t("empty")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => {
                if (mode === "picker") {
                  onPick?.(asset);
                } else {
                  setDetail(asset);
                  setAltAr(asset.alt_ar);
                  setConfirmDelete(false);
                }
              }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-creamy-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.alt_ar || asset.original_name}
                loading="lazy"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-brown-900/60 px-2 py-1 text-start text-[11px] text-creamy-100 opacity-0 transition-opacity group-hover:opacity-100" dir="ltr">
                {asset.original_name}
              </span>
            </button>
          ))}
        </div>
      )}

      {next && state === "ready" ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => load({ cursor: cursorFrom(next), append: true })}
            className="rounded-full border border-line px-6 py-2.5 text-[13.5px] font-bold text-brown-500 hover:border-brown-400"
          >
            {t("loadMore")}
          </button>
        </div>
      ) : null}

      {/* Detail modal (screen mode) */}
      {detail ? (
        <Modal title={detail.original_name} onClose={() => setDetail(null)} width={560}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={detail.url} alt={detail.alt_ar} className="mb-4 max-h-72 w-full rounded-2xl object-contain" />
          <p className="mb-4 text-[12.5px] text-brown-300" dir="ltr">
            {detail.width}×{detail.height} · {(detail.size_bytes / 1024).toFixed(0)}KB · {detail.mime}
          </p>
          <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("altLabel")}</label>
          <input
            value={altAr}
            onChange={(e) => setAltAr(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] focus:border-brown-400 focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.origin + detail.url);
                toast("info", t("urlCopied"));
              }}
              className="text-[13px] font-bold text-blue-500 hover:underline"
            >
              {t("copyUrl")}
            </button>
            {can(me, "media.delete") ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[13px] font-bold text-danger hover:underline"
              >
                {t("delete")}
              </button>
            ) : null}
          </div>
          {confirmDelete ? (
            <p className="mt-3 rounded-xl bg-danger-tint px-4 py-3 text-[13px] text-danger">
              {t("deleteConfirm")}
            </p>
          ) : null}
          <ModalActions
            confirmLabel={confirmDelete ? t("deleteCta") : t("saveCta")}
            onConfirm={confirmDelete ? removeAsset : saveAlt}
            onCancel={() => setDetail(null)}
            danger={confirmDelete}
            busy={busy}
          />
        </Modal>
      ) : null}
    </div>
  );
}

/** Cover/inline-image picker modal wrapping the library. */
export function MediaPicker({ onPick, onClose }: { onPick: (asset: MediaAsset) => void; onClose: () => void }) {
  const t = useTranslations("admin.media");
  return (
    <Modal title={t("pickerTitle")} onClose={onClose} width={860}>
      <MediaLibrary mode="picker" onPick={onPick} />
    </Modal>
  );
}
