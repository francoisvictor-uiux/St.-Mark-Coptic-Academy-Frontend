"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  getRole,
  permissionCatalog,
  putRolePermissions,
  updateRole,
  type CatalogModule,
  type Role,
} from "@/lib/admin-api";
import { CheckIcon, ShieldIcon, SpinnerIcon } from "@/components/auth/icons";
import { ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

const ACTION_ORDER = [
  "view", "create", "edit", "delete", "publish", "approve",
  "export", "import", "assign", "archive", "restore",
] as const;

const GROUP_ORDER = ["content", "academic", "events", "system"] as const;

type PermInfo = {
  id: string;
  code: string;
  action: string;
  moduleKey: string;
  guarded: boolean;
  dependsOn: string[];
};

/** ADM-05 — permission matrix editor. */
export default function RoleMatrixScreen({ roleId }: { roleId: string }) {
  const t = useTranslations("admin.matrix");
  const tActions = useTranslations("admin.userDetail.actions");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();
  const isSuperAdmin = me?.user_type === "super_admin";

  const [role, setRole] = useState<(Role & { permission_ids: string[] }) | null>(null);
  const [catalog, setCatalog] = useState<CatalogModule[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [nameDraft, setNameDraft] = useState("");
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [roleData, catalogData] = await Promise.all([getRole(roleId), permissionCatalog()]);
      setRole(roleData);
      setCatalog(catalogData.modules);
      const ids = new Set(roleData.permission_ids);
      setSelected(new Set(ids));
      setInitial(new Set(ids));
      setNameDraft(roleData.name_ar);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [roleId]);

  useEffect(() => {
    load();
  }, [load]);

  const { byId, idByCode } = useMemo(() => {
    const byId = new Map<string, PermInfo>();
    const idByCode = new Map<string, string>();
    for (const mod of catalog) {
      for (const perm of mod.permissions) {
        byId.set(perm.id, {
          id: perm.id,
          code: perm.code,
          action: perm.action,
          moduleKey: mod.key,
          guarded: perm.is_guarded,
          dependsOn: perm.depends_on,
        });
        idByCode.set(perm.code, perm.id);
      }
    }
    return { byId, idByCode };
  }, [catalog]);

  const readOnly = role?.is_system ?? false;

  const toggle = useCallback(
    (permId: string) => {
      if (readOnly) return;
      const info = byId.get(permId);
      if (!info || (info.guarded && !isSuperAdmin)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(permId)) {
          // Uncheck + cascade to dependents (spec ADM-05 §7).
          const removeWithDependents = (id: string) => {
            next.delete(id);
            const code = byId.get(id)?.code;
            if (!code) return;
            for (const candidate of next) {
              const cInfo = byId.get(candidate);
              if (cInfo?.dependsOn.includes(code)) removeWithDependents(candidate);
            }
          };
          removeWithDependents(permId);
        } else {
          // Check + auto-resolve dependencies.
          const addWithDeps = (id: string) => {
            if (next.has(id)) return;
            next.add(id);
            const pInfo = byId.get(id);
            for (const depCode of pInfo?.dependsOn ?? []) {
              const depId = idByCode.get(depCode);
              if (depId) addWithDeps(depId);
            }
          };
          addWithDeps(permId);
        }
        return next;
      });
    },
    [byId, idByCode, readOnly, isSuperAdmin],
  );

  const toggleModule = useCallback(
    (mod: CatalogModule) => {
      if (readOnly) return;
      setSelected((prev) => {
        const next = new Set(prev);
        const togglable = mod.permissions.filter((p) => !p.is_guarded || isSuperAdmin);
        const allOn = togglable.every((p) => next.has(p.id));
        if (allOn) {
          for (const perm of togglable) next.delete(perm.id);
        } else {
          for (const perm of togglable) next.add(perm.id);
        }
        return next;
      });
    },
    [readOnly, isSuperAdmin],
  );

  const diff = useMemo(() => {
    const added: string[] = [];
    const removed: string[] = [];
    for (const id of selected) if (!initial.has(id)) added.push(byId.get(id)?.code ?? id);
    for (const id of initial) if (!selected.has(id)) removed.push(byId.get(id)?.code ?? id);
    return { added: added.sort(), removed: removed.sort() };
  }, [selected, initial, byId]);

  const dirty = diff.added.length > 0 || diff.removed.length > 0;

  async function save() {
    setSaving(true);
    try {
      const result = await putRolePermissions(roleId, [...selected]);
      toast("success", t("saved", { count: result.affected_users }));
      setInitial(new Set(selected));
      setReview(false);
    } catch (error) {
      setReview(false);
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setSaving(false);
    }
  }

  async function saveName() {
    if (!role || readOnly || !nameDraft.trim() || nameDraft.trim() === role.name_ar) return;
    try {
      await updateRole(roleId, { name_ar: nameDraft.trim() });
      setRole((r) => (r ? { ...r, name_ar: nameDraft.trim() } : r));
      toast("success", t("nameSaved"));
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    }
  }

  if (state === "error") return <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />;
  if (state === "loading" || !role) {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon className="size-6 text-brown-300" />
      </div>
    );
  }

  const groups = GROUP_ORDER.map((group) => ({
    group,
    modules: catalog.filter((m) => m.group === group),
  })).filter((g) => g.modules.length > 0);

  return (
    <div className="pb-24">
      <Link href="/admin/roles" className="mb-4 inline-block text-[13px] font-bold text-blue-500 hover:underline">
        ← {t("back")}
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            disabled={readOnly}
            aria-label={t("roleName")}
            className="w-full max-w-md rounded-xl border border-transparent bg-transparent font-display text-[24px] font-bold text-brown-900 hover:border-line focus:border-brown-400 focus:bg-creamy-50 focus:outline-none disabled:opacity-70"
          />
          <p className="text-[13px] text-brown-300" dir="ltr">{role.slug} · {t("members", { count: role.member_count })}</p>
        </div>
        {readOnly ? (
          <span className="rounded-xl bg-warning-tint px-4 py-2 text-[13px] font-bold text-warning">{t("systemReadOnly")}</span>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[980px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky start-0 z-10 bg-card px-4 py-3 text-start text-[12px] font-bold text-brown-300">
                {t("moduleColumn")}
              </th>
              {ACTION_ORDER.map((action) => (
                <th key={action} className="px-1 py-3 text-center text-[11.5px] font-bold text-brown-300">
                  {tActions(action)}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[11.5px] font-bold text-brown-300">{t("allColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ group, modules }) => (
              <GroupRows
                key={group}
                group={group}
                modules={modules}
                selected={selected}
                toggle={toggle}
                toggleModule={toggleModule}
                readOnly={readOnly}
                isSuperAdmin={isSuperAdmin}
                locale={locale}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Diff footer (spec ADM-05 §5) */}
      {dirty && !readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-brown-900">
              <span className="font-bold text-success">+{diff.added.length}</span>
              {" · "}
              <span className="font-bold text-danger">−{diff.removed.length}</span>
              {" "}{t("pendingChanges")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set(initial))}
                className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-brown-500 hover:border-brown-400"
              >
                {t("discard")}
              </button>
              <button
                type="button"
                onClick={() => setReview(true)}
                className="rounded-full bg-brown-500 px-5 py-2 text-[13px] font-bold text-creamy-100 hover:bg-brown-600"
              >
                {t("reviewSave")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Review modal (spec ADM-05 §8) */}
      {review ? (
        <Modal title={t("reviewTitle")} onClose={() => setReview(false)} width={560}>
          {diff.added.length > 0 ? (
            <div className="mb-4">
              <h3 className="mb-1.5 text-[13px] font-bold text-success">{t("addedList", { count: diff.added.length })}</h3>
              <div className="flex flex-wrap gap-1.5">
                {diff.added.map((code) => (
                  <span key={code} dir="ltr" className="rounded-md bg-success-tint px-2 py-0.5 font-mono text-[12px] text-success">
                    +{code}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {diff.removed.length > 0 ? (
            <div className="mb-4">
              <h3 className="mb-1.5 text-[13px] font-bold text-danger">{t("removedList", { count: diff.removed.length })}</h3>
              <div className="flex flex-wrap gap-1.5">
                {diff.removed.map((code) => (
                  <span key={code} dir="ltr" className="rounded-md bg-danger-tint px-2 py-0.5 font-mono text-[12px] text-danger">
                    −{code}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-[13px] text-brown-400">{t("affectedNote", { count: role.member_count })}</p>
          <ModalActions confirmLabel={t("confirmSave")} onConfirm={save} onCancel={() => setReview(false)} busy={saving} />
        </Modal>
      ) : null}
    </div>
  );
}

function GroupRows({
  group,
  modules,
  selected,
  toggle,
  toggleModule,
  readOnly,
  isSuperAdmin,
  locale,
}: {
  group: string;
  modules: CatalogModule[];
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleModule: (mod: CatalogModule) => void;
  readOnly: boolean;
  isSuperAdmin: boolean;
  locale: string;
}) {
  const t = useTranslations("admin.matrix");
  const isSystem = group === "system";
  return (
    <>
      <tr className={isSystem ? "border-t-2 border-warning/40" : ""}>
        <td
          colSpan={13}
          className={`sticky start-0 px-4 pb-1 pt-4 text-[11.5px] font-bold ${
            isSystem ? "text-warning" : "text-brown-300"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {isSystem ? <ShieldIcon className="size-3.5" /> : null}
            {t(`groups.${group}` as "groups.content")}
          </span>
        </td>
      </tr>
      {modules.map((mod) => {
        const byAction = new Map(mod.permissions.map((p) => [p.action, p]));
        const togglable = mod.permissions.filter((p) => !p.is_guarded || isSuperAdmin);
        const onCount = togglable.filter((p) => selected.has(p.id)).length;
        const allState: "none" | "some" | "all" =
          onCount === 0 ? "none" : onCount === togglable.length ? "all" : "some";
        return (
          <tr key={mod.key} className="border-t border-line hover:bg-creamy-100">
            <td className="sticky start-0 z-10 whitespace-nowrap bg-card px-4 py-2 font-bold text-brown-900">
              {locale === "ar" ? mod.name_ar : mod.name_en}
            </td>
            {ACTION_ORDER.map((action) => {
              const perm = byAction.get(action);
              if (!perm) return <td key={action} className="px-1 py-2 text-center text-brown-100">·</td>;
              const on = selected.has(perm.id);
              const locked = readOnly || (perm.is_guarded && !isSuperAdmin);
              return (
                <td key={action} className="px-1 py-2 text-center">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`${mod.key}.${action}`}
                    disabled={locked}
                    onClick={() => toggle(perm.id)}
                    title={perm.is_guarded ? t("guardedTooltip") : perm.code}
                    className={`relative inline-flex size-6 items-center justify-center rounded-md border-2 transition-colors ${
                      on
                        ? "border-brown-500 bg-brown-500 text-creamy-100"
                        : "border-brown-100 bg-creamy-50 text-transparent hover:border-brown-300"
                    } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <CheckIcon className="size-3.5" />
                    {perm.is_guarded ? (
                      <ShieldIcon className="absolute -end-1.5 -top-1.5 size-3 text-warning" />
                    ) : null}
                  </button>
                </td>
              );
            })}
            <td className="px-3 py-2 text-center">
              <button
                type="button"
                role="checkbox"
                aria-checked={allState === "all" ? true : allState === "some" ? "mixed" : false}
                aria-label={t("toggleModule", { module: mod.key })}
                disabled={readOnly}
                onClick={() => toggleModule(mod)}
                className={`inline-flex size-6 items-center justify-center rounded-md border-2 text-[12px] font-bold transition-colors ${
                  allState === "all"
                    ? "border-brown-500 bg-brown-500 text-creamy-100"
                    : allState === "some"
                      ? "border-brown-500 text-brown-500"
                      : "border-brown-100 text-transparent hover:border-brown-300"
                } ${readOnly ? "cursor-not-allowed opacity-50" : ""}`}
              >
                {allState === "some" ? "−" : <CheckIcon className="size-3.5" />}
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
