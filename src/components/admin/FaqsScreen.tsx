"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import {
  createFaq,
  deleteFaq,
  listFaqs,
  reorderFaqs,
  updateFaq,
  type FaqItem,
} from "@/lib/content-api";
import { SpinnerIcon } from "@/components/auth/icons";
import { EmptyState, ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] focus:border-brown-400 focus:outline-none";

export default function FaqsScreen() {
  const t = useTranslations("admin.faqs");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<FaqItem | "new" | null>(null);
  const [form, setForm] = useState({ question_ar: "", question_en: "", answer_ar: "", answer_en: "" });
  const [deleting, setDeleting] = useState<FaqItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { faqs: list } = await listFaqs();
      setFaqs(list);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= faqs.length) return;
    const next = [...faqs];
    [next[index], next[target]] = [next[target], next[index]];
    setFaqs(next);
    try {
      const { faqs: saved } = await reorderFaqs(next.map((f) => f.id));
      setFaqs(saved);
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
      load();
    }
  }

  async function togglePublish(faq: FaqItem) {
    try {
      const updated = await updateFaq(faq.id, { is_published: !faq.is_published });
      setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      toast("success", updated.is_published ? t("toasts.published") : t("toasts.unpublished"));
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    }
  }

  async function save() {
    if (!form.question_ar.trim() || !form.answer_ar.trim()) return;
    setBusy(true);
    try {
      if (editing === "new") {
        await createFaq(form);
        toast("success", t("toasts.created"));
      } else if (editing) {
        await updateFaq(editing.id, form);
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

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
        {can(me, "faqs.create") ? (
          <button
            type="button"
            onClick={() => {
              setEditing("new");
              setForm({ question_ar: "", question_en: "", answer_ar: "", answer_en: "" });
            }}
            className="rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600"
          >
            {t("create")}
          </button>
        ) : null}
      </div>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />
      ) : state === "loading" ? (
        <div className="flex justify-center py-24">
          <SpinnerIcon className="size-6 text-brown-300" />
        </div>
      ) : faqs.length === 0 ? (
        <EmptyState text={t("empty")} />
      ) : (
        <ul className="space-y-3">
          {faqs.map((faq, index) => (
            <li key={faq.id} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brown-900">{faq.question_ar}</p>
                  <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-brown-400">{faq.answer_ar}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {can(me, "faqs.edit") ? (
                    <>
                      <button type="button" aria-label={t("moveUp")} onClick={() => move(index, -1)} disabled={index === 0}
                        className="flex size-8 items-center justify-center rounded-lg text-brown-300 hover:bg-creamy-200 disabled:opacity-30">↑</button>
                      <button type="button" aria-label={t("moveDown")} onClick={() => move(index, 1)} disabled={index === faqs.length - 1}
                        className="flex size-8 items-center justify-center rounded-lg text-brown-300 hover:bg-creamy-200 disabled:opacity-30">↓</button>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
                {can(me, "faqs.publish") ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={faq.is_published}
                    onClick={() => togglePublish(faq)}
                    className={`rounded-full px-3.5 py-1 text-[12.5px] font-bold ${
                      faq.is_published ? "bg-success-tint text-success" : "bg-creamy-300 text-brown-400"
                    }`}
                  >
                    {faq.is_published ? t("publishedBadge") : t("draftBadge")}
                  </button>
                ) : (
                  <span className={`rounded-full px-3.5 py-1 text-[12.5px] font-bold ${
                    faq.is_published ? "bg-success-tint text-success" : "bg-creamy-300 text-brown-400"
                  }`}>
                    {faq.is_published ? t("publishedBadge") : t("draftBadge")}
                  </span>
                )}
                {can(me, "faqs.edit") ? (
                  <button type="button" onClick={() => { setEditing(faq); setForm({
                    question_ar: faq.question_ar, question_en: faq.question_en,
                    answer_ar: faq.answer_ar, answer_en: faq.answer_en,
                  }); }} className="text-[13px] font-bold text-blue-500 hover:underline">
                    {t("edit")}
                  </button>
                ) : null}
                {can(me, "faqs.delete") ? (
                  <button type="button" onClick={() => setDeleting(faq)} className="text-[13px] font-bold text-danger hover:underline">
                    {t("delete")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <Modal title={editing === "new" ? t("create") : t("editTitle")} onClose={() => setEditing(null)} width={620}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.questionAr")}</label>
              <input value={form.question_ar} onChange={(e) => setForm((f) => ({ ...f, question_ar: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.answerAr")}</label>
              <textarea value={form.answer_ar} onChange={(e) => setForm((f) => ({ ...f, answer_ar: e.target.value }))} rows={4}
                className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] focus:border-brown-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.questionEn")}</label>
              <input dir="ltr" value={form.question_en} onChange={(e) => setForm((f) => ({ ...f, question_en: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.answerEn")}</label>
              <textarea dir="ltr" value={form.answer_en} onChange={(e) => setForm((f) => ({ ...f, answer_en: e.target.value }))} rows={3}
                className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] focus:border-brown-400 focus:outline-none" />
            </div>
          </div>
          <ModalActions
            confirmLabel={t("saveCta")}
            onConfirm={save}
            onCancel={() => setEditing(null)}
            busy={busy}
            disabled={!form.question_ar.trim() || !form.answer_ar.trim()}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title={t("deleteTitle")} onClose={() => setDeleting(null)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">{t("deleteBody")}</p>
          <ModalActions
            confirmLabel={t("deleteCta")}
            onConfirm={async () => {
              await deleteFaq(deleting.id);
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
