"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type Category,
} from "@/lib/content-api";
import { SpinnerIcon } from "@/components/auth/icons";
import { EmptyState, ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] focus:border-brown-400 focus:outline-none";

export default function CategoriesScreen() {
  const t = useTranslations("admin.categories");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState({ name_ar: "", name_en: "" });
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { categories: list } = await listCategories();
      setCategories(list);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!form.name_ar.trim()) return;
    setBusy(true);
    try {
      if (editing === "new") {
        await createCategory({ name_ar: form.name_ar.trim(), name_en: form.name_en.trim() });
        toast("success", t("toasts.created"));
      } else if (editing) {
        await updateCategory(editing.id, { name_ar: form.name_ar.trim(), name_en: form.name_en.trim() });
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

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteCategory(deleting.id);
      toast("success", t("toasts.deleted"));
      setDeleting(null);
      load();
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
        {can(me, "categories.create") ? (
          <button
            type="button"
            onClick={() => {
              setEditing("new");
              setForm({ name_ar: "", name_en: "" });
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
      ) : categories.length === 0 ? (
        <EmptyState text={t("empty")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-[12px] text-brown-300">
                <th className="px-5 py-3 text-start font-bold">{t("columns.name")}</th>
                <th className="px-5 py-3 text-start font-bold">{t("columns.slug")}</th>
                <th className="px-5 py-3 text-start font-bold">{t("columns.articles")}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-t border-line hover:bg-creamy-100">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-brown-900">{category.name_ar}</span>
                    {category.name_en ? (
                      <span className="ms-2 text-[12.5px] text-brown-300" dir="ltr">{category.name_en}</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 text-brown-400" dir="ltr">{category.slug}</td>
                  <td className="px-5 py-3.5 text-brown-400">{category.article_count}</td>
                  <td className="px-5 py-3.5 text-end">
                    {can(me, "categories.edit") ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(category);
                          setForm({ name_ar: category.name_ar, name_en: category.name_en });
                        }}
                        className="me-3 text-[13px] font-bold text-blue-500 hover:underline"
                      >
                        {t("edit")}
                      </button>
                    ) : null}
                    {can(me, "categories.delete") ? (
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
                        className="text-[13px] font-bold text-danger hover:underline"
                      >
                        {t("delete")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <Modal title={editing === "new" ? t("create") : t("editTitle")} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.nameAr")}</label>
              <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.nameEn")}</label>
              <input dir="ltr" value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <ModalActions
            confirmLabel={t("saveCta")}
            onConfirm={save}
            onCancel={() => setEditing(null)}
            busy={busy}
            disabled={!form.name_ar.trim()}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title={t("deleteTitle")} onClose={() => setDeleting(null)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">
            {t("deleteBody", { name: deleting.name_ar, count: deleting.article_count })}
          </p>
          <ModalActions confirmLabel={t("deleteCta")} onConfirm={remove} onCancel={() => setDeleting(null)} danger busy={busy} />
        </Modal>
      ) : null}
    </div>
  );
}
