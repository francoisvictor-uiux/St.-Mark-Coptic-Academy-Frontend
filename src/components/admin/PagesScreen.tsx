"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import {
  createPage,
  deletePage,
  listPages,
  setPageStatus,
  updatePage,
  type SitePage,
} from "@/lib/content-api";
import { SpinnerIcon } from "@/components/auth/icons";
import RichTextEditor from "./RichTextEditor";
import { ContentStatusBadge } from "./ArticlesScreen";
import { EmptyState, ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] focus:border-brown-400 focus:outline-none";

type Draft = { title_ar: string; title_en: string; slug: string; body_ar: string; body_en: string };
const emptyDraft: Draft = { title_ar: "", title_en: "", slug: "", body_ar: "", body_en: "" };

export default function PagesScreen() {
  const t = useTranslations("admin.pages");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();

  const [pages, setPages] = useState<SitePage[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<SitePage | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<SitePage | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const page = await listPages();
      setPages(page.results);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEditor(page: SitePage | "new") {
    setEditing(page);
    setLang("ar");
    setDraft(page === "new" ? emptyDraft : {
      title_ar: page.title_ar, title_en: page.title_en, slug: page.slug,
      body_ar: page.body_ar, body_en: page.body_en,
    });
  }

  async function save() {
    if (!draft.title_ar.trim()) return;
    setBusy(true);
    try {
      const payload = {
        title_ar: draft.title_ar.trim(), title_en: draft.title_en.trim(),
        slug: draft.slug.trim(), body_ar: draft.body_ar, body_en: draft.body_en,
      };
      if (editing === "new") {
        await createPage(payload);
        toast("success", t("toasts.created"));
      } else if (editing) {
        await updatePage(editing.id, payload);
        toast("success", t("toasts.saved"));
      }
      setEditing(null);
      load();
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(page: SitePage) {
    try {
      await setPageStatus(page.id, page.status === "published" ? "unpublish" : "publish");
      toast("success", page.status === "published" ? t("toasts.unpublished") : t("toasts.published"));
      load();
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    }
  }

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
        {can(me, "pages.create") ? (
          <button
            type="button"
            onClick={() => openEditor("new")}
            className="rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600"
          >
            {t("create")}
          </button>
        ) : null}
      </div>
      <p className="mb-5 text-[13px] text-brown-300">{t("hint")}</p>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />
      ) : state === "loading" ? (
        <div className="flex justify-center py-24">
          <SpinnerIcon className="size-6 text-brown-300" />
        </div>
      ) : pages.length === 0 ? (
        <EmptyState text={t("empty")} />
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5">
              <div>
                <p className="font-bold text-brown-900">{page.title_ar}</p>
                <p className="text-[12.5px] text-brown-300" dir="ltr">/pages/{page.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <ContentStatusBadge status={page.status} />
                {can(me, "pages.publish") ? (
                  <button type="button" onClick={() => togglePublish(page)} className="text-[13px] font-bold text-blue-500 hover:underline">
                    {page.status === "published" ? t("unpublish") : t("publish")}
                  </button>
                ) : null}
                {can(me, "pages.edit") ? (
                  <button type="button" onClick={() => openEditor(page)} className="text-[13px] font-bold text-blue-500 hover:underline">
                    {t("edit")}
                  </button>
                ) : null}
                {can(me, "pages.delete") ? (
                  <button type="button" onClick={() => setDeleting(page)} className="text-[13px] font-bold text-danger hover:underline">
                    {t("delete")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <Modal title={editing === "new" ? t("create") : t("editTitle")} onClose={() => setEditing(null)} width={780}>
          <div className="space-y-4">
            <div role="tablist" className="flex gap-1 rounded-xl bg-creamy-200 p-1" style={{ width: "fit-content" }}>
              {(["ar", "en"] as const).map((key) => (
                <button key={key} role="tab" aria-selected={lang === key} onClick={() => setLang(key)}
                  className={`rounded-lg px-4 py-1.5 text-[13px] font-bold transition-colors ${
                    lang === key ? "bg-card text-brown-900 shadow-sm" : "text-brown-400"
                  }`}>
                  {key === "ar" ? "العربية" : "English"}
                </button>
              ))}
            </div>
            {lang === "ar" ? (
              <>
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleAr")}</label>
                  <input value={draft.title_ar} onChange={(e) => setDraft((d) => ({ ...d, title_ar: e.target.value }))} className={inputCls} />
                </div>
                <RichTextEditor value={draft.body_ar} onChange={(html) => setDraft((d) => ({ ...d, body_ar: html }))} dir="rtl" />
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleEn")}</label>
                  <input dir="ltr" value={draft.title_en} onChange={(e) => setDraft((d) => ({ ...d, title_en: e.target.value }))} className={inputCls} />
                </div>
                <RichTextEditor value={draft.body_en} onChange={(html) => setDraft((d) => ({ ...d, body_en: html }))} dir="ltr" />
              </>
            )}
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.slug")}</label>
              <input dir="ltr" value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                placeholder={t("slugHint")} className={inputCls} />
            </div>
          </div>
          <ModalActions confirmLabel={t("saveCta")} onConfirm={save} onCancel={() => setEditing(null)} busy={busy} disabled={!draft.title_ar.trim()} />
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title={t("deleteTitle")} onClose={() => setDeleting(null)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">{t("deleteBody", { title: deleting.title_ar })}</p>
          <ModalActions
            confirmLabel={t("deleteCta")}
            onConfirm={async () => {
              await deletePage(deleting.id);
              toast("success", t("toasts.deleted"));
              setDeleting(null);
              load();
            }}
            onCancel={() => setDeleting(null)}
            danger
          />
        </Modal>
      ) : null}
    </div>
  );
}
