"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import {
  createEvent,
  deleteEvent,
  listEvents,
  setEventStatus,
  updateEvent,
  type EventItem,
  type MediaAsset,
} from "@/lib/content-api";
import SearchableSelect from "@/components/auth/SearchableSelect";
import { SpinnerIcon } from "@/components/auth/icons";
import { MediaPicker } from "./MediaLibrary";
import { ContentStatusBadge } from "./ArticlesScreen";
import { cursorFrom, EmptyState, ErrorCard, KebabMenu, Modal, ModalActions, SkeletonRows } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] focus:border-brown-400 focus:outline-none";

type Draft = {
  title_ar: string;
  title_en: string;
  event_type: string;
  starts_date: string;
  starts_time: string;
  location_ar: string;
  capacity_status: string;
  description_ar: string;
  cover: MediaAsset | null;
};

const emptyDraft: Draft = {
  title_ar: "", title_en: "", event_type: "conference",
  starts_date: "", starts_time: "18:00", location_ar: "",
  capacity_status: "open", description_ar: "", cover: null,
};

export default function EventsScreen() {
  const t = useTranslations("admin.events");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();

  const [rows, setRows] = useState<EventItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<EventItem | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState<EventItem | null>(null);

  const load = useCallback(async (opts: { cursor?: string; append?: boolean } = {}) => {
    if (!opts.append) setState("loading");
    try {
      const page = await listEvents({ cursor: opts.cursor });
      setRows((prev) => (opts.append ? [...prev, ...page.results] : page.results));
      setNext(page.next);
      setState("ready");
    } catch {
      if (!opts.append) setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEditor(event: EventItem | "new") {
    setEditing(event);
    if (event === "new") {
      setDraft(emptyDraft);
    } else {
      const starts = new Date(event.starts_at);
      setDraft({
        title_ar: event.title_ar,
        title_en: event.title_en,
        event_type: event.event_type,
        starts_date: starts.toISOString().slice(0, 10),
        starts_time: starts.toISOString().slice(11, 16),
        location_ar: event.location_ar,
        capacity_status: event.capacity_status,
        description_ar: event.description_ar,
        cover: event.cover,
      });
    }
  }

  async function save() {
    if (!draft.title_ar.trim() || !draft.starts_date) {
      toast("danger", t("requiredHint"));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title_ar: draft.title_ar.trim(),
        title_en: draft.title_en.trim(),
        event_type: draft.event_type,
        starts_at: `${draft.starts_date}T${draft.starts_time || "18:00"}:00Z`,
        location_ar: draft.location_ar.trim(),
        capacity_status: draft.capacity_status,
        description_ar: draft.description_ar.trim(),
        cover_id: draft.cover?.id ?? null,
      };
      if (editing === "new") {
        await createEvent(payload);
        toast("success", t("toasts.created"));
      } else if (editing) {
        await updateEvent(editing.id, payload);
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

  async function toggleStatus(event: EventItem) {
    try {
      const action = event.status === "published" ? "unpublish" : "publish";
      await setEventStatus(event.id, action);
      toast("success", action === "publish" ? t("toasts.published") : t("toasts.unpublished"));
      load();
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteEvent(deleting.id);
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
        {can(me, "events.create") ? (
          <button
            type="button"
            onClick={() => openEditor("new")}
            className="rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600"
          >
            {t("create")}
          </button>
        ) : null}
      </div>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={() => load()} retryLabel={t("retry")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead>
              <tr className="text-[12px] text-brown-300">
                <th className="px-4 py-3 text-start font-bold">{t("columns.title")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.type")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.date")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.location")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.capacity")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.status")}</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {state === "loading" ? (
                <SkeletonRows rows={6} cols={7} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState text={t("empty")} />
                  </td>
                </tr>
              ) : (
                rows.map((event) => (
                  <tr key={event.id} className="border-t border-line hover:bg-creamy-100">
                    <td className="px-4 py-3 font-bold text-brown-900">{event.title_ar}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[12px] text-blue-500">
                        {t(`types.${event.event_type}` as "types.conference")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brown-400" dir="ltr">
                      {new Date(event.starts_at).toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-3 text-brown-400">{event.location_ar || "—"}</td>
                    <td className="px-4 py-3 text-brown-400">{t(`capacity.${event.capacity_status}` as "capacity.open")}</td>
                    <td className="px-4 py-3"><ContentStatusBadge status={event.status} /></td>
                    <td className="px-2 py-3">
                      <KebabMenu
                        label={t("rowActions")}
                        items={[
                          { label: t("edit"), onClick: () => openEditor(event), hidden: !can(me, "events.edit") },
                          {
                            label: event.status === "published" ? t("unpublish") : t("publish"),
                            onClick: () => toggleStatus(event),
                            hidden: !can(me, "events.publish"),
                          },
                          { label: t("delete"), onClick: () => setDeleting(event), danger: true, hidden: !can(me, "events.delete") },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* Editor modal */}
      {editing ? (
        <Modal title={editing === "new" ? t("create") : t("editTitle")} onClose={() => setEditing(null)} width={620}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleAr")}</label>
              <input value={draft.title_ar} onChange={(e) => setDraft((d) => ({ ...d, title_ar: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleEn")}</label>
              <input dir="ltr" value={draft.title_en} onChange={(e) => setDraft((d) => ({ ...d, title_en: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SearchableSelect
                size="sm"
                label={t("fields.type")}
                placeholder=""
                searchable={false}
                value={draft.event_type}
                onChange={(v) => setDraft((d) => ({ ...d, event_type: v ?? "conference" }))}
                options={[
                  { value: "conference", label: t("types.conference") },
                  { value: "seminar", label: t("types.seminar") },
                  { value: "discussion", label: t("types.discussion") },
                ]}
              />
              <SearchableSelect
                size="sm"
                label={t("fields.capacity")}
                placeholder=""
                searchable={false}
                value={draft.capacity_status}
                onChange={(v) => setDraft((d) => ({ ...d, capacity_status: v ?? "open" }))}
                options={[
                  { value: "open", label: t("capacity.open") },
                  { value: "full", label: t("capacity.full") },
                  { value: "online", label: t("capacity.online") },
                ]}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.date")}</label>
                <input type="date" dir="ltr" value={draft.starts_date} onChange={(e) => setDraft((d) => ({ ...d, starts_date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.time")}</label>
                <input type="time" dir="ltr" value={draft.starts_time} onChange={(e) => setDraft((d) => ({ ...d, starts_time: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.location")}</label>
              <input value={draft.location_ar} onChange={(e) => setDraft((d) => ({ ...d, location_ar: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.description")}</label>
              <textarea
                value={draft.description_ar}
                onChange={(e) => setDraft((d) => ({ ...d, description_ar: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] focus:border-brown-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.cover")}</label>
              {draft.cover ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.cover.url} alt="" className="h-16 rounded-xl object-cover" />
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
          <ModalActions
            confirmLabel={t("saveCta")}
            onConfirm={save}
            onCancel={() => setEditing(null)}
            busy={busy}
            disabled={!draft.title_ar.trim() || !draft.starts_date}
          />
        </Modal>
      ) : null}

      {pickerOpen ? (
        <MediaPicker
          onClose={() => setPickerOpen(false)}
          onPick={(asset) => {
            setDraft((d) => ({ ...d, cover: asset }));
            setPickerOpen(false);
          }}
        />
      ) : null}

      {deleting ? (
        <Modal title={t("deleteTitle")} onClose={() => setDeleting(null)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">{t("deleteBody", { title: deleting.title_ar })}</p>
          <ModalActions confirmLabel={t("deleteCta")} onConfirm={remove} onCancel={() => setDeleting(null)} danger busy={busy} />
        </Modal>
      ) : null}
    </div>
  );
}
