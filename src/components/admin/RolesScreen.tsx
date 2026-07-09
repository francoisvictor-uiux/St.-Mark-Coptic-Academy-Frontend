"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  can,
  createRole,
  deleteRole,
  duplicateRole,
  listRoles,
  type Role,
} from "@/lib/admin-api";
import { SpinnerIcon } from "@/components/auth/icons";
import { EmptyState, ErrorCard, KebabMenu, Modal, ModalActions, TypedConfirm } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] text-brown-900 focus:border-brown-400 focus:outline-none";

/** ADM-04 — roles inventory. */
export default function RolesScreen() {
  const t = useTranslations("admin.roles");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const { user: me } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name_ar: "", name_en: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [blockedMembers, setBlockedMembers] = useState<{ role: Role; members: { email: string; name_ar: string }[] } | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { roles: list } = await listRoles();
      setRoles(list);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!form.name_ar.trim() || !form.name_en.trim()) return;
    setBusy(true);
    try {
      const role = await createRole({
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim(),
        description: form.description.trim(),
      });
      toast("success", t("toasts.created"));
      router.push(`/admin/roles/${role.id}`);
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteRole(deleting.id);
      toast("success", t("toasts.deleted"));
      setDeleting(null);
      load();
    } catch (error) {
      setDeleting(null);
      if (error instanceof ApiError && error.status === 409) {
        // Members block deletion (spec ADM-04 §8).
        setBlockedMembers({ role: deleting, members: [] });
      } else {
        toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
        {can(me, "roles.create") ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600"
          >
            {t("createRole")}
          </button>
        ) : null}
      </div>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />
      ) : state === "loading" ? (
        <div className="flex justify-center py-24">
          <SpinnerIcon className="size-6 text-brown-300" />
        </div>
      ) : roles.length === 0 ? (
        <EmptyState text={t("empty")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => router.push(`/admin/roles/${role.id}`)}
              className="cursor-pointer rounded-2xl border border-line bg-card p-5 transition-colors hover:border-brown-400"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-bold text-brown-900">
                    {locale === "ar" ? role.name_ar : role.name_en}
                  </h2>
                  <p className="text-[12px] text-brown-300" dir="ltr">{role.slug}</p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <KebabMenu
                    label={t("cardActions")}
                    items={[
                      { label: t("actions.open"), onClick: () => router.push(`/admin/roles/${role.id}`) },
                      {
                        label: t("actions.duplicate"),
                        onClick: async () => {
                          try {
                            const copy = await duplicateRole(role.id);
                            toast("success", t("toasts.duplicated"));
                            router.push(`/admin/roles/${copy.id}`);
                          } catch (error) {
                            toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
                          }
                        },
                        hidden: !can(me, "roles.create"),
                      },
                      {
                        label: t("actions.delete"),
                        onClick: () => setDeleting(role),
                        danger: true,
                        hidden: role.is_system || !can(me, "roles.delete"),
                      },
                    ]}
                  />
                </div>
              </div>
              {role.description ? (
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-brown-400">{role.description}</p>
              ) : null}
              <div className="mt-4 flex items-center gap-4 text-[12.5px] text-brown-300">
                <span>{t("permissionCount", { count: role.permission_count })}</span>
                <span>{t("memberCount", { count: role.member_count })}</span>
                {role.is_system ? (
                  <span className="rounded-md bg-creamy-300 px-2 py-0.5 font-bold text-brown-500">{t("systemLock")}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen ? (
        <Modal title={t("createRole")} onClose={() => setCreateOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.nameAr")}</label>
              <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.nameEn")}</label>
              <input dir="ltr" value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.description")}</label>
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <ModalActions
            confirmLabel={t("createCta")}
            onConfirm={handleCreate}
            onCancel={() => setCreateOpen(false)}
            busy={busy}
            disabled={!form.name_ar.trim() || !form.name_en.trim()}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <TypedConfirm
          title={t("deleteConfirm.title")}
          body={t("deleteConfirm.body", { name: locale === "ar" ? deleting.name_ar : deleting.name_en })}
          requiredText={deleting.slug}
          confirmLabel={t("deleteConfirm.cta")}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          busy={busy}
        />
      ) : null}

      {blockedMembers ? (
        <Modal title={t("blocked.title")} onClose={() => setBlockedMembers(null)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">
            {t("blocked.body", { name: locale === "ar" ? blockedMembers.role.name_ar : blockedMembers.role.name_en })}
          </p>
          <ModalActions
            confirmLabel={t("blocked.cta")}
            onConfirm={() => setBlockedMembers(null)}
            onCancel={() => setBlockedMembers(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
