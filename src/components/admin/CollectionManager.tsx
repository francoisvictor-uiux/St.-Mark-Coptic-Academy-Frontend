"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import type { CollectionApi, MediaAsset } from "@/lib/content-api";
import SearchableSelect from "@/components/auth/SearchableSelect";
import { SpinnerIcon } from "@/components/auth/icons";
import { MediaPicker } from "./MediaLibrary";
import { EmptyState, ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] focus:border-brown-400 focus:outline-none";

export type FieldDef = {
  key: string;
  /** message key under `<ns>.fields.` */
  labelKey: string;
  type: "text" | "textarea" | "ltr" | "number" | "select" | "media" | "tags";
  required?: boolean;
  /** For `select`: static options translated via `<ns>.options.<labelKey>`,
   * or dynamic options carrying a ready-to-render `label`. */
  options?: { value: string; labelKey?: string; label?: string }[];
  /** For `select`: allow an empty choice (sends `null` instead of `""`). */
  nullable?: boolean;
  /** For `select`: enable the searchable combobox (default off). */
  searchable?: boolean;
};

type BaseItem = {
  id: string;
  sort_order: number;
  is_published: boolean;
};

type CollectionManagerProps<T extends BaseItem> = {
  /** messages namespace, e.g. "admin.testimonials" */
  ns: string;
  api: CollectionApi<T>;
  fields: FieldDef[];
  itemTitle: (item: T) => string;
  itemSubtitle?: (item: T) => string;
  itemImage?: (item: T) => string | undefined;
  /** hide the page h1 when embedded in a tabbed screen */
  embedded?: boolean;
};

export default function CollectionManager<T extends BaseItem>({
  ns,
  api,
  fields,
  itemTitle,
  itemSubtitle,
  itemImage,
  embedded,
}: CollectionManagerProps<T>) {
  const t = useTranslations(ns);
  const locale = useLocale();
  const toast = useToast();

  const [items, setItems] = useState<T[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [mediaFor, setMediaFor] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setItems(await api.list());
      setState("ready");
    } catch {
      setState("error");
    }
  }, [api]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEditor(item: T | "new") {
    setEditing(item);
    const next: Record<string, unknown> = {};
    const preview: Record<string, string> = {};
    for (const field of fields) {
      if (item === "new") {
        next[field.key] = field.type === "number" ? "" : "";
      } else if (field.type === "media") {
        const rel = (item as Record<string, unknown>)[field.key.replace(/_id$/, "")] as MediaAsset | null;
        next[field.key] = rel?.id ?? null;
        if (rel?.url) preview[field.key] = rel.url;
      } else if (field.type === "tags") {
        const arr = (item as Record<string, unknown>)[field.key];
        next[field.key] = Array.isArray(arr) ? arr.join("، ") : "";
      } else if (field.type === "select" && field.key.endsWith("_id")) {
        // Relational select — read the id off the nested object (e.g. category_id ← category).
        const rel = (item as Record<string, unknown>)[field.key.replace(/_id$/, "")] as { id: string } | null;
        next[field.key] = rel?.id ?? "";
      } else {
        next[field.key] = (item as Record<string, unknown>)[field.key] ?? "";
      }
    }
    setMediaPreview(preview);
    setForm(next);
  }

  const missingRequired = fields.some(
    (f) => f.required && !String(form[f.key] ?? "").trim(),
  );

  async function save() {
    if (missingRequired) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const raw = form[field.key];
        if (field.type === "number") {
          payload[field.key] = Number(raw) || 0;
        } else if (field.type === "tags") {
          payload[field.key] = String(raw ?? "")
            .split(/[,،]/)
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (field.type === "select" && field.nullable) {
          payload[field.key] = raw ? raw : null;
        } else {
          payload[field.key] = raw ?? "";
        }
      }
      if (editing === "new") {
        await api.create(payload);
        toast("success", t("toasts.created"));
      } else if (editing) {
        await api.patch(editing.id, payload);
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

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      setItems(await api.reorder(next.map((i) => i.id)));
    } catch {
      load();
    }
  }

  async function togglePublish(item: T) {
    try {
      const updated = await api.patch(item.id, { is_published: !item.is_published });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast("success", updated.is_published ? t("toasts.published") : t("toasts.unpublished"));
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    }
  }

  return (
    <div className={embedded ? "" : "mx-auto max-w-[880px]"}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {!embedded ? (
          <h1 className="font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
        ) : <span />}
        <button
          type="button"
          onClick={() => openEditor("new")}
          className="rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600"
        >
          {t("create")}
        </button>
      </div>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />
      ) : state === "loading" ? (
        <div className="flex justify-center py-16">
          <SpinnerIcon className="size-6 text-brown-300" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState text={t("empty")} />
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4">
              {itemImage?.(item) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={itemImage(item)} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-brown-900">{itemTitle(item)}</p>
                {itemSubtitle ? (
                  <p className="truncate text-[13px] text-brown-400">{itemSubtitle(item)}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.is_published}
                  onClick={() => togglePublish(item)}
                  className={`rounded-full px-3 py-1 text-[12px] font-bold ${
                    item.is_published ? "bg-success-tint text-success" : "bg-creamy-300 text-brown-400"
                  }`}
                >
                  {item.is_published ? t("publishedBadge") : t("draftBadge")}
                </button>
                <button type="button" aria-label={t("moveUp")} onClick={() => move(index, -1)} disabled={index === 0}
                  className="flex size-8 items-center justify-center rounded-lg text-brown-300 hover:bg-creamy-200 disabled:opacity-30">↑</button>
                <button type="button" aria-label={t("moveDown")} onClick={() => move(index, 1)} disabled={index === items.length - 1}
                  className="flex size-8 items-center justify-center rounded-lg text-brown-300 hover:bg-creamy-200 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => openEditor(item)} className="ms-1 text-[13px] font-bold text-blue-500 hover:underline">
                  {t("edit")}
                </button>
                <button type="button" onClick={() => setDeleting(item)} className="ms-1 text-[13px] font-bold text-danger hover:underline">
                  {t("delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <Modal title={editing === "new" ? t("create") : t("editTitle")} onClose={() => setEditing(null)} width={640}>
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-[13px] font-bold text-brown-500">
                  {t(`fields.${field.labelKey}` as "fields")}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] focus:border-brown-400 focus:outline-none"
                  />
                ) : field.type === "select" ? (
                  <SearchableSelect
                    size="sm"
                    searchable={field.searchable ?? false}
                    placeholder=""
                    ariaLabel={t(`fields.${field.labelKey}` as "fields")}
                    value={String(form[field.key] ?? "") || null}
                    onChange={(v) => setForm((f) => ({ ...f, [field.key]: v ?? "" }))}
                    options={(field.options ?? []).map((o) => ({
                      value: o.value,
                      label: o.label ?? t(`options.${o.labelKey}` as "options"),
                    }))}
                  />
                ) : field.type === "media" ? (
                  <div className="flex items-center gap-3">
                    {mediaPreview[field.key] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaPreview[field.key]} alt="" className="h-14 rounded-xl object-cover" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setMediaFor(field.key)}
                      className="rounded-xl border-2 border-dashed border-line px-4 py-2.5 text-[13px] text-brown-400 hover:border-brown-400 hover:text-brown-500"
                    >
                      {mediaPreview[field.key] ? t("changeImage") : t("pickImage")}
                    </button>
                  </div>
                ) : (
                  <input
                    dir={field.type === "ltr" || field.type === "number" ? "ltr" : undefined}
                    type={field.type === "number" ? "number" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className={inputCls}
                  />
                )}
              </div>
            ))}
          </div>
          <ModalActions
            confirmLabel={t("saveCta")}
            onConfirm={save}
            onCancel={() => setEditing(null)}
            busy={busy}
            disabled={missingRequired}
          />
        </Modal>
      ) : null}

      {mediaFor ? (
        <MediaPicker
          onClose={() => setMediaFor(null)}
          onPick={(asset) => {
            setForm((f) => ({ ...f, [mediaFor]: asset.id }));
            setMediaPreview((p) => ({ ...p, [mediaFor]: asset.url }));
            setMediaFor(null);
          }}
        />
      ) : null}

      {deleting ? (
        <Modal title={t("deleteTitle")} onClose={() => setDeleting(null)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">{t("deleteBody")}</p>
          <ModalActions
            confirmLabel={t("deleteCta")}
            onConfirm={async () => {
              try {
                await api.remove(deleting.id);
                toast("success", t("toasts.deleted"));
                setDeleting(null);
                load();
              } catch (error) {
                toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
              }
            }}
            onCancel={() => setDeleting(null)}
            danger
          />
        </Modal>
      ) : null}
    </div>
  );
}
