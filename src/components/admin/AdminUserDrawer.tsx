"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createAdmin,
  updateUser,
  type AdminUserDetail,
  type CatalogModule,
  type Role,
} from "@/lib/admin-api";
import { ShieldIcon, SpinnerIcon } from "@/components/auth/icons";
import { useToast } from "./AdminShell";

const ARABIC_NAME = /^[؀-ۿ\s]{2,50}$/;
const LATIN_NAME = /^[A-Za-z\s.'-]{2,100}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] text-brown-900 focus:border-brown-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

type AdminUserDrawerProps = {
  /** null → create mode */
  user: AdminUserDetail | null;
  roles: Role[];
  catalog: CatalogModule[];
  onClose: () => void;
  onSaved: () => void;
};

/** ADM-02 — create/edit administrator drawer with live permission preview. */
export default function AdminUserDrawer({ user, roles, catalog, onClose, onSaved }: AdminUserDrawerProps) {
  const t = useTranslations("admin.drawer");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();

  const [form, setForm] = useState({
    email: user?.email ?? "",
    first_name_ar: user?.first_name_ar ?? "",
    last_name_ar: user?.last_name_ar ?? "",
    full_name_en: user?.full_name_en ?? "",
    phone: user?.phone ?? "",
    expiry: user?.account_expires_at ? user.account_expires_at.slice(0, 10) : "",
  });
  const [roleIds, setRoleIds] = useState<string[]>(user?.roles.map((r) => r.id) ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isEdit = user !== null;
  const editingSelf = isEdit && me?.id === user.id;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const codeById = useMemo(() => {
    const map = new Map<string, { code: string; guarded: boolean }>();
    for (const mod of catalog) {
      for (const perm of mod.permissions) {
        map.set(perm.id, { code: perm.code, guarded: perm.is_guarded });
      }
    }
    return map;
  }, [catalog]);

  /** Live preview (spec ADM-02 §3): union of selected roles' permissions by module. */
  const preview = useMemo(() => {
    const selected = new Set<string>();
    let guardedCount = 0;
    for (const role of roles) {
      if (!roleIds.includes(role.id)) continue;
      for (const pid of role.permission_ids ?? []) {
        const info = codeById.get(pid);
        if (info && !selected.has(info.code)) {
          selected.add(info.code);
          if (info.guarded) guardedCount += 1;
        }
      }
    }
    const byModule = catalog
      .map((mod) => ({
        module: mod,
        actions: mod.permissions.filter((p) => selected.has(p.code)),
      }))
      .filter((entry) => entry.actions.length > 0);
    return { byModule, total: selected.size, guardedCount };
  }, [roles, roleIds, catalog, codeById]);

  function patch(partial: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...partial }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!isEdit && !EMAIL_RE.test(form.email.trim().toLowerCase())) e.email = t("errors.email");
    if (!ARABIC_NAME.test(form.first_name_ar.trim())) e.first_name_ar = t("errors.arabicName");
    if (!ARABIC_NAME.test(form.last_name_ar.trim())) e.last_name_ar = t("errors.arabicName");
    if (!LATIN_NAME.test(form.full_name_en.trim())) e.full_name_en = t("errors.latinName");
    if (roleIds.length === 0) e.roles = t("errors.rolesRequired");
    if (form.expiry && new Date(form.expiry) <= new Date()) e.expiry = t("errors.expiryFuture");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    try {
      const expiry = form.expiry ? `${form.expiry}T23:59:59Z` : null;
      if (isEdit) {
        await updateUser(user.id, {
          first_name_ar: form.first_name_ar.trim(),
          last_name_ar: form.last_name_ar.trim(),
          full_name_en: form.full_name_en.trim(),
          phone: form.phone.trim(),
          account_expires_at: expiry,
          ...(editingSelf ? {} : { role_ids: roleIds }),
        });
        toast("success", t("saved"));
      } else {
        await createAdmin({
          email: form.email.trim().toLowerCase(),
          first_name_ar: form.first_name_ar.trim(),
          last_name_ar: form.last_name_ar.trim(),
          full_name_en: form.full_name_en.trim(),
          phone: form.phone.trim(),
          role_ids: roleIds,
          account_expires_at: expiry,
        });
        toast("success", t("invited"));
      }
      onSaved();
    } catch (error) {
      setBusy(false);
      if (error instanceof ApiError && error.code === "validation_error" && error.fields.email) {
        setErrors({ email: t("errors.emailTaken") });
      } else {
        toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
      }
    }
  }

  function fieldRow(key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) {
    return (
      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{label}</label>
        <input
          value={form[key]}
          onChange={(e) => {
            patch({ [key]: e.target.value } as Partial<typeof form>);
            setErrors((prev) => ({ ...prev, [key]: "" }));
          }}
          className={inputCls}
          {...props}
        />
        {errors[key] ? <p className="mt-1 text-[12px] text-danger">{errors[key]}</p> : null}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-brown-900/40" onPointerDown={onClose} />
      {/* Drawer slides from the end edge (spec Part 1 §4.6) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? t("editTitle", { name: user.name_ar }) : t("createTitle")}
        className="absolute inset-y-0 end-0 flex w-full max-w-[480px] flex-col bg-card shadow-[0_16px_48px_rgba(36,17,15,0.16)]"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-[19px] font-bold text-brown-900">
            {isEdit ? t("editTitle", { name: user.name_ar }) : t("createTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex size-9 items-center justify-center rounded-lg text-brown-300 hover:bg-creamy-200"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* ① Identity */}
          <section className="space-y-3">
            <h3 className="text-[14px] font-bold text-brown-900">{t("sections.identity")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {fieldRow("first_name_ar", t("fields.firstNameAr"))}
              {fieldRow("last_name_ar", t("fields.lastNameAr"))}
            </div>
            {fieldRow("full_name_en", t("fields.fullNameEn"), { dir: "ltr" })}
            {isEdit ? (
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.email")}</label>
                <p dir="ltr" className="rounded-xl bg-creamy-200 px-4 py-2.5 text-[14px] text-brown-400">{user.email}</p>
              </div>
            ) : (
              fieldRow("email", t("fields.email"), { dir: "ltr", type: "email", autoComplete: "off" })
            )}
            {fieldRow("phone", t("fields.phone"), { dir: "ltr", type: "tel" })}
          </section>

          {/* ② Roles */}
          <section>
            <h3 className="mb-2 text-[14px] font-bold text-brown-900">{t("sections.roles")}</h3>
            {editingSelf ? (
              <p className="rounded-xl bg-warning-tint px-4 py-3 text-[13px] text-warning">{t("selfRoles")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roles.filter((role) => !role.is_system).map((role) => {
                  const on = roleIds.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setRoleIds((ids) => (on ? ids.filter((x) => x !== role.id) : [...ids, role.id]));
                        setErrors((prev) => ({ ...prev, roles: "" }));
                      }}
                      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                        on
                          ? "border-brown-500 bg-brown-500 text-creamy-100"
                          : "border-line bg-creamy-50 text-brown-400 hover:border-brown-400"
                      }`}
                    >
                      {locale === "ar" ? role.name_ar : role.name_en}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.roles ? <p className="mt-1.5 text-[12px] text-danger">{errors.roles}</p> : null}
          </section>

          {/* ③ Live permission preview */}
          {!editingSelf ? (
            <section>
              <h3 className="mb-2 flex items-baseline justify-between text-[14px] font-bold text-brown-900">
                {t("sections.preview")}
                <span className="text-[12px] font-normal text-brown-300">
                  {t("previewCount", { count: preview.total })}
                </span>
              </h3>
              {preview.byModule.length === 0 ? (
                <p className="rounded-xl bg-creamy-200 px-4 py-3 text-[13px] text-brown-400">{t("previewEmpty")}</p>
              ) : (
                <div className="space-y-2 rounded-xl border border-line p-3">
                  {preview.byModule.map(({ module, actions }) => (
                    <div key={module.key} className="flex flex-wrap items-baseline gap-1.5">
                      <span className="min-w-24 text-[13px] font-bold text-brown-500">
                        {locale === "ar" ? module.name_ar : module.name_en}
                      </span>
                      {actions.map((perm) => (
                        <span
                          key={perm.id}
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] ${
                            perm.is_guarded ? "bg-warning-tint text-warning" : "bg-blue-50 text-blue-500"
                          }`}
                        >
                          {perm.is_guarded ? <ShieldIcon className="size-3" /> : null}
                          {t(`actions.${perm.action}` as "actions.view")}
                        </span>
                      ))}
                    </div>
                  ))}
                  {preview.guardedCount > 0 ? (
                    <p className="flex items-center gap-1.5 border-t border-line pt-2 text-[12px] text-warning">
                      <ShieldIcon className="size-3.5" />
                      {t("guardedNote", { count: preview.guardedCount })}
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          {/* ④ Options */}
          <section>
            <h3 className="mb-2 text-[14px] font-bold text-brown-900">{t("sections.options")}</h3>
            <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.expiry")}</label>
            <input
              type="date"
              dir="ltr"
              value={form.expiry}
              onChange={(e) => patch({ expiry: e.target.value })}
              className={inputCls}
            />
            <p className="mt-1 text-[12px] text-brown-300">{t("expiryHint")}</p>
            {errors.expiry ? <p className="mt-1 text-[12px] text-danger">{errors.expiry}</p> : null}
          </section>
        </div>

        <footer className="flex gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brown-500 px-6 py-3 text-[15px] font-bold text-creamy-100 hover:bg-brown-600 disabled:opacity-50"
          >
            {busy ? <SpinnerIcon className="size-4" /> : null}
            {isEdit ? t("saveCta") : t("inviteCta")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-6 py-3 text-[15px] font-bold text-brown-500 hover:border-brown-400"
          >
            {t("cancel")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
