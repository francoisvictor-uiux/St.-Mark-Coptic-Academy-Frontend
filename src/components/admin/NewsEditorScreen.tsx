"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import {
  createNews,
  deleteNews,
  getNews,
  setNewsStatus,
  updateNews,
  type MediaAsset,
  type NewsDetail,
} from "@/lib/content-api";
import { SpinnerIcon } from "@/components/auth/icons";
import RichTextEditor from "./RichTextEditor";
import { MediaPicker } from "./MediaLibrary";
import { ContentStatusBadge } from "./ArticlesScreen";
import { ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14.5px] text-brown-900 focus:border-brown-400 focus:outline-none";

type Draft = {
  title_ar: string;
  title_en: string;
  slug: string;
  excerpt_ar: string;
  body_ar: string;
  body_en: string;
  cover: MediaAsset | null;
};

const empty: Draft = {
  title_ar: "", title_en: "", slug: "", excerpt_ar: "", body_ar: "", body_en: "", cover: null,
};

export default function NewsEditorScreen({ newsId }: { newsId: string }) {
  const t = useTranslations("admin.newsEditor");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const { user: me } = useAuth();
  const isNew = newsId === "new";

  const [draft, setDraft] = useState<Draft>(empty);
  const [item, setItem] = useState<NewsDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">(isNew ? "ready" : "loading");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (isNew) return;
    setState("loading");
    try {
      const data = await getNews(newsId);
      setItem(data);
      setDraft({
        title_ar: data.title_ar, title_en: data.title_en, slug: data.slug,
        excerpt_ar: data.excerpt_ar, body_ar: data.body_ar, body_en: data.body_en,
        cover: data.cover,
      });
      setState("ready");
    } catch {
      setState("error");
    }
  }, [newsId, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(): Promise<NewsDetail | null> {
    if (!draft.title_ar.trim()) {
      toast("danger", t("titleRequired"));
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        title_ar: draft.title_ar.trim(),
        title_en: draft.title_en.trim(),
        slug: draft.slug.trim(),
        excerpt_ar: draft.excerpt_ar.trim(),
        body_ar: draft.body_ar,
        body_en: draft.body_en,
        cover_id: draft.cover?.id ?? null,
      };
      const saved = isNew ? await createNews(payload) : await updateNews(newsId, payload);
      setItem(saved);
      toast("success", t("saved"));
      if (isNew) router.replace(`/admin/news/${saved.id}`);
      return saved;
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!item) return;
    setPublishing(true);
    try {
      const saved = await save();
      if (!saved) return;
      const action = saved.status === "published" ? "unpublish" : "publish";
      const updated = await setNewsStatus(saved.id, action);
      setItem(updated);
      toast("success", action === "publish" ? t("published") : t("unpublished"));
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setPublishing(false);
    }
  }

  if (state === "error") return <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />;
  if (state === "loading") {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon className="size-6 text-brown-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/news" className="text-[13px] font-bold text-blue-500 hover:underline">
            ← {t("back")}
          </Link>
          {item ? <ContentStatusBadge status={item.status} /> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew && can(me, "news.delete") ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-full border border-danger px-4 py-2 text-[13px] font-bold text-danger hover:bg-danger hover:text-creamy-50"
            >
              {t("delete")}
            </button>
          ) : null}
          {item && can(me, "news.publish") ? (
            <button
              type="button"
              onClick={togglePublish}
              disabled={publishing}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold disabled:opacity-50 ${
                item.status === "published"
                  ? "border border-line text-brown-500 hover:border-brown-400"
                  : "bg-success text-creamy-50 hover:opacity-90"
              }`}
            >
              {publishing ? <SpinnerIcon className="size-3.5" /> : null}
              {item.status === "published" ? t("unpublish") : t("publish")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-brown-500 px-5 py-2 text-[13px] font-bold text-creamy-100 hover:bg-brown-600 disabled:opacity-50"
          >
            {saving ? <SpinnerIcon className="size-3.5" /> : null}
            {t("save")}
          </button>
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-line bg-card p-6">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleAr")}</label>
          <input value={draft.title_ar} onChange={(e) => setDraft((d) => ({ ...d, title_ar: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.excerptAr")}</label>
          <textarea
            value={draft.excerpt_ar}
            onChange={(e) => setDraft((d) => ({ ...d, excerpt_ar: e.target.value }))}
            maxLength={300}
            rows={2}
            className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] focus:border-brown-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.bodyAr")}</label>
          <RichTextEditor value={draft.body_ar} onChange={(html) => setDraft((d) => ({ ...d, body_ar: html }))} dir="rtl" />
        </div>
        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleEn")}</label>
            <input dir="ltr" value={draft.title_en} onChange={(e) => setDraft((d) => ({ ...d, title_en: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.slug")}</label>
            <input dir="ltr" value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} placeholder={t("slugAuto")} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-[13px] font-bold text-brown-500">{t("fields.cover")}</label>
          {draft.cover ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.cover.url} alt="" className="h-24 rounded-xl object-cover" />
              <button type="button" onClick={() => setDraft((d) => ({ ...d, cover: null }))} className="text-[13px] font-bold text-danger hover:underline">
                {t("removeCover")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-xl border-2 border-dashed border-line px-5 py-3 text-[13px] text-brown-300 hover:border-brown-400 hover:text-brown-500"
            >
              {t("pickCover")}
            </button>
          )}
        </div>
      </div>

      {pickerOpen ? (
        <MediaPicker
          onClose={() => setPickerOpen(false)}
          onPick={(asset) => {
            setDraft((d) => ({ ...d, cover: asset }));
            setPickerOpen(false);
          }}
        />
      ) : null}

      {confirmDelete && item ? (
        <Modal title={t("deleteTitle")} onClose={() => setConfirmDelete(false)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">{t("deleteBody", { title: item.title_ar })}</p>
          <ModalActions
            confirmLabel={t("deleteCta")}
            onConfirm={async () => {
              await deleteNews(item.id);
              toast("success", t("deleted"));
              router.push("/admin/news");
            }}
            onCancel={() => setConfirmDelete(false)}
            danger
          />
        </Modal>
      ) : null}
    </div>
  );
}
