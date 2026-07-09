"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  can,
  deleteUser,
  getUser,
  listUsers,
  permissionCatalog,
  listRoles,
  resendInvite,
  resetUserPassword,
  revokeInvite,
  setUserStatus,
  type AdminUser,
  type AdminUserDetail,
  type CatalogModule,
  type Role,
} from "@/lib/admin-api";
import SearchableSelect from "@/components/auth/SearchableSelect";
import AdminUserDrawer from "./AdminUserDrawer";
import {
  cursorFrom,
  EmptyState,
  ErrorCard,
  KebabMenu,
  Modal,
  ModalActions,
  RelativeTime,
  RoleChips,
  SkeletonRows,
  StatusBadge,
  TypeBadge,
  TypedConfirm,
} from "./ui";
import { useToast } from "./AdminShell";

type PendingAction =
  | { kind: "deactivate" | "activate" | "reset" | "revoke-invite"; user: AdminUser }
  | { kind: "delete"; user: AdminUser };

/** ADM-01 — Users list. */
export default function UsersScreen() {
  const t = useTranslations("admin.users");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const { user: me } = useAuth();

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; user: AdminUserDetail | null }>({ open: false, user: null });
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<CatalogModule[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const canCreate = me?.user_type === "super_admin" && can(me, "users.create");

  const load = useCallback(
    async (opts: { cursor?: string; append?: boolean } = {}) => {
      if (!opts.append) setState("loading");
      else setLoadingMore(true);
      try {
        const params = {
          q: q.trim().length >= 2 ? q.trim() : undefined,
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          cursor: opts.cursor,
        };
        const page = await listUsers(params);
        setRows((prev) => (opts.append ? [...prev, ...page.results] : page.results));
        setNext(page.next);
        setState("ready");
      } catch {
        if (!opts.append) setState("error");
      } finally {
        setLoadingMore(false);
      }
    },
    [q, typeFilter, statusFilter],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [load]);

  useEffect(() => {
    if (!canCreate && me?.user_type !== "super_admin") return;
    listRoles(true).then((r) => setRoles(r.roles)).catch(() => {});
    permissionCatalog().then((r) => setCatalog(r.modules)).catch(() => {});
  }, [canCreate, me]);

  async function openEdit(row: AdminUser) {
    try {
      const detail = await getUser(row.id);
      setDrawer({ open: true, user: detail });
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    }
  }

  async function runPending() {
    if (!pending) return;
    setActionBusy(true);
    const target = pending.user;
    try {
      if (pending.kind === "deactivate") {
        await setUserStatus(target.id, "deactivate");
        toast("success", t("toasts.deactivated", { name: target.name_ar }));
      } else if (pending.kind === "activate") {
        await setUserStatus(target.id, "activate");
        toast("success", t("toasts.activated", { name: target.name_ar }));
      } else if (pending.kind === "reset") {
        await resetUserPassword(target.id);
        toast("success", t("toasts.resetSent"));
      } else if (pending.kind === "revoke-invite") {
        await revokeInvite(target.id);
        toast("success", t("toasts.inviteRevoked"));
      } else if (pending.kind === "delete") {
        await deleteUser(target.id);
        toast("success", t("toasts.deleted", { name: target.name_ar }));
      }
      setPending(null);
      load();
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
      setPending(null);
    } finally {
      setActionBusy(false);
    }
  }

  const canActOn = useCallback(
    (row: AdminUser) => {
      if (!me || row.id === me.id) return false;
      if (me.user_type === "super_admin") return true;
      return row.user_type === "student";
    },
    [me],
  );

  const kebabFor = useCallback(
    (row: AdminUser) => {
      const manageable = canActOn(row);
      return [
        { label: t("actions.view"), onClick: () => router.push(`/admin/users/${row.id}`) },
        {
          label: t("actions.edit"),
          onClick: () => openEdit(row),
          hidden: !manageable || !can(me, "users.edit") || row.user_type === "student",
        },
        {
          label: t("actions.resendInvite"),
          onClick: async () => {
            try {
              await resendInvite(row.id);
              toast("success", t("toasts.inviteResent"));
            } catch (error) {
              toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
            }
          },
          hidden: !manageable || row.status !== "invited" || !can(me, "users.create"),
        },
        {
          label: t("actions.revokeInvite"),
          onClick: () => setPending({ kind: "revoke-invite", user: row }),
          hidden: !manageable || row.status !== "invited" || !can(me, "users.create"),
        },
        {
          label: t("actions.resetPassword"),
          onClick: () => setPending({ kind: "reset", user: row }),
          hidden: !manageable || !can(me, "users.edit") || row.status === "invited",
        },
        {
          label: row.status === "suspended" ? t("actions.activate") : t("actions.deactivate"),
          onClick: () =>
            setPending({ kind: row.status === "suspended" ? "activate" : "deactivate", user: row }),
          hidden: !manageable || !can(me, "users.edit") || row.status === "invited",
        },
        {
          label: t("actions.delete"),
          onClick: () => setPending({ kind: "delete", user: row }),
          danger: true,
          hidden: !manageable || !can(me, "users.delete"),
        },
      ];
    },
    [me, canActOn, t, router, toast, locale],
  );

  const hasFilters = q.trim().length >= 2 || typeFilter || statusFilter;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
          <p className="text-[13px] text-brown-300">{t("count", { count: rows.length })}{next ? "+" : ""}</p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setDrawer({ open: true, user: null })}
            className="rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600"
          >
            {t("addAdmin")}
          </button>
        ) : null}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full max-w-xs rounded-xl border border-line bg-creamy-50 px-4 text-[13.5px] text-brown-900 placeholder:text-brown-200 focus:border-brown-400 focus:outline-none"
        />
        <SearchableSelect
          size="sm"
          searchable={false}
          className="w-44"
          ariaLabel={t("filters.type")}
          placeholder={t("filters.allTypes")}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v ?? "")}
          options={[
            { value: "", label: t("filters.allTypes") },
            { value: "super_admin", label: t("filters.superAdmins") },
            { value: "admin", label: t("filters.admins") },
            { value: "student", label: t("filters.students") },
          ]}
        />
        <SearchableSelect
          size="sm"
          searchable={false}
          className="w-44"
          ariaLabel={t("filters.status")}
          placeholder={t("filters.allStatuses")}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? "")}
          options={[
            { value: "", label: t("filters.allStatuses") },
            { value: "active", label: t("filters.active") },
            { value: "suspended", label: t("filters.suspended") },
            { value: "pending_verification", label: t("filters.pending") },
            { value: "invited", label: t("filters.invited") },
          ]}
        />
      </div>

      {/* Table */}
      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={() => load()} retryLabel={t("retry")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[760px] text-[13.5px]">
            <thead>
              <tr className="text-start text-[12px] text-brown-300">
                <th className="px-4 py-3 text-start font-bold">{t("columns.name")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.email")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.type")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.roles")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.status")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.lastLogin")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {state === "loading" ? (
                <SkeletonRows rows={8} cols={7} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState text={hasFilters ? t("emptyFiltered") : t("empty")} />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/admin/users/${row.id}`)}
                    className="cursor-pointer border-t border-line transition-colors hover:bg-creamy-100"
                  >
                    <td className="px-4 py-3">
                      <span className="block font-bold text-brown-900">{row.name_ar}</span>
                      <span className="block text-[12px] text-brown-300" dir="ltr">{row.full_name_en}</span>
                    </td>
                    <td className="px-4 py-3" dir="ltr">
                      <span className="text-brown-500">{row.email}</span>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={row.user_type} /></td>
                    <td className="px-4 py-3"><RoleChips roles={row.roles} /></td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-brown-400"><RelativeTime iso={row.last_login} /></td>
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <KebabMenu items={kebabFor(row)} label={t("rowActions")} />
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
            disabled={loadingMore}
            onClick={() => load({ cursor: cursorFrom(next), append: true })}
            className="rounded-full border border-line px-6 py-2.5 text-[13.5px] font-bold text-brown-500 hover:border-brown-400 disabled:opacity-50"
          >
            {loadingMore ? t("loading") : t("loadMore")}
          </button>
        </div>
      ) : null}

      {/* Confirm modals */}
      {pending && pending.kind !== "delete" ? (
        <Modal
          title={t(`confirm.${pending.kind}.title` as "confirm.deactivate.title")}
          onClose={() => setPending(null)}
        >
          <p className="text-[14.5px] leading-relaxed text-brown-500">
            {t(`confirm.${pending.kind}.body` as "confirm.deactivate.body", { name: pending.user.name_ar })}
          </p>
          <ModalActions
            confirmLabel={t(`confirm.${pending.kind}.cta` as "confirm.deactivate.cta")}
            onConfirm={runPending}
            onCancel={() => setPending(null)}
            danger={pending.kind === "deactivate" || pending.kind === "revoke-invite"}
            busy={actionBusy}
          />
        </Modal>
      ) : null}
      {pending?.kind === "delete" ? (
        <TypedConfirm
          title={t("confirm.delete.title")}
          body={t("confirm.delete.body", { name: pending.user.name_ar })}
          requiredText={pending.user.email}
          confirmLabel={t("confirm.delete.cta")}
          onConfirm={runPending}
          onCancel={() => setPending(null)}
          busy={actionBusy}
        />
      ) : null}

      {/* ADM-02 drawer */}
      {drawer.open ? (
        <AdminUserDrawer
          user={drawer.user}
          roles={roles}
          catalog={catalog}
          onClose={() => setDrawer({ open: false, user: null })}
          onSaved={() => {
            setDrawer({ open: false, user: null });
            load();
          }}
        />
      ) : null}
    </div>
  );
}
