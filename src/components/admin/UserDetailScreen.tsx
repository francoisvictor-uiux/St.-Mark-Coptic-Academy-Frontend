"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  can,
  getUser,
  permissionCatalog,
  resetUserPassword,
  revokeAllSessions,
  revokeSession,
  setUserStatus,
  userActivity,
  userSessions,
  type AdminUserDetail,
  type AuditEntry,
  type CatalogModule,
  type SessionRow,
} from "@/lib/admin-api";
import { SpinnerIcon } from "@/components/auth/icons";
import { ErrorCard, Modal, ModalActions, RelativeTime, StatusBadge, TypeBadge, cursorFrom } from "./ui";
import { useToast } from "./AdminShell";

type TabKey = "overview" | "permissions" | "activity" | "sessions";

/** ADM-03 — 360° user view. */
export default function UserDetailScreen({ userId }: { userId: string }) {
  const t = useTranslations("admin.userDetail");
  const tAudit = useTranslations("admin.audit");
  const locale = useLocale();
  const toast = useToast();
  const { user: me } = useAuth();

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<TabKey>("overview");
  const [catalog, setCatalog] = useState<CatalogModule[]>([]);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [activityNext, setActivityNext] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [confirm, setConfirm] = useState<"deactivate" | "activate" | "reset" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const data = await getUser(userId);
      setDetail(data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [userId]);

  useEffect(() => {
    load();
    permissionCatalog().then((r) => setCatalog(r.modules)).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (tab === "activity" && activity.length === 0) {
      userActivity(userId).then((page) => {
        setActivity(page.results);
        setActivityNext(page.next);
      }).catch(() => {});
    }
    if (tab === "sessions" && sessions === null) {
      userSessions(userId).then((r) => setSessions(r.sessions)).catch(() => setSessions([]));
    }
  }, [tab, userId, activity.length, sessions]);

  const permissionsByModule = useMemo(() => {
    if (!detail) return [];
    const held = new Set(detail.permissions);
    return catalog
      .map((mod) => ({
        module: mod,
        actions: mod.permissions.filter((p) => held.has(p.code)),
      }))
      .filter((x) => x.actions.length > 0);
  }, [detail, catalog]);

  const manageable = useMemo(() => {
    if (!me || !detail || me.id === detail.id) return false;
    if (me.user_type === "super_admin") return true;
    return detail.user_type === "student";
  }, [me, detail]);

  async function runConfirm() {
    if (!confirm || !detail) return;
    setBusy(true);
    try {
      if (confirm === "reset") {
        await resetUserPassword(detail.id);
        toast("success", t("toasts.resetSent"));
      } else {
        await setUserStatus(detail.id, confirm);
        toast("success", confirm === "deactivate" ? t("toasts.deactivated") : t("toasts.activated"));
        load();
      }
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  if (state === "error") {
    return <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />;
  }
  if (state === "loading" || !detail) {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon className="size-6 text-brown-300" />
      </div>
    );
  }

  const TABS: TabKey[] = ["overview", "permissions", "activity", "sessions"];

  return (
    <div>
      <Link href="/admin/users" className="mb-4 inline-block text-[13px] font-bold text-blue-500 hover:underline">
        ← {t("back")}
      </Link>

      {/* Header card */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-creamy-400 font-serif text-[20px] font-bold text-brown-500">
            {detail.first_name_ar.slice(0, 1)}
          </span>
          <div>
            <h1 className="font-display text-[20px] font-bold text-brown-900">{detail.name_ar}</h1>
            <p className="text-[13px] text-brown-300" dir="ltr">{detail.full_name_en} · {detail.email}</p>
            <div className="mt-1.5 flex gap-2">
              <TypeBadge type={detail.user_type} />
              <StatusBadge status={detail.status} />
            </div>
          </div>
        </div>
        {manageable && can(me, "users.edit") ? (
          <div className="flex flex-wrap gap-2">
            {detail.status !== "invited" ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirm("reset")}
                  className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-brown-500 hover:border-brown-400"
                >
                  {t("actions.resetPassword")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(detail.status === "suspended" ? "activate" : "deactivate")}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold ${
                    detail.status === "suspended"
                      ? "bg-success text-creamy-50"
                      : "border border-danger text-danger hover:bg-danger hover:text-creamy-50"
                  }`}
                >
                  {detail.status === "suspended" ? t("actions.activate") : t("actions.deactivate")}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div role="tablist" className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-t-xl px-4 py-2.5 text-[14px] transition-colors ${
              tab === key
                ? "border-b-2 border-brown-500 font-bold text-brown-900"
                : "text-brown-300 hover:text-brown-500"
            }`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <dl className="grid gap-x-8 gap-y-4 rounded-2xl border border-line bg-card p-6 sm:grid-cols-2">
          {[
            [t("fields.email"), detail.email, true],
            [t("fields.phone"), detail.phone || "—", true],
            [t("fields.locale"), detail.locale, true],
            [t("fields.created"), new Date(detail.created_at).toISOString().slice(0, 10), true],
            [t("fields.emailVerified"), detail.email_verified_at ? new Date(detail.email_verified_at).toISOString().slice(0, 10) : "—", true],
            [t("fields.invitedBy"), detail.invited_by_label || "—", true],
            [t("fields.expiry"), detail.account_expires_at ? detail.account_expires_at.slice(0, 10) : "—", true],
          ].map(([label, value, ltr], i) => (
            <div key={i}>
              <dt className="text-[12px] font-bold text-brown-300">{label as string}</dt>
              <dd className="mt-0.5 text-[14.5px] text-brown-900" dir={ltr ? "ltr" : undefined} style={{ textAlign: "start" }}>
                {value as string}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {tab === "permissions" ? (
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {detail.roles.length === 0 ? (
              <p className="text-[14px] text-brown-300">{t("noRoles")}</p>
            ) : (
              detail.roles.map((role) => (
                <span key={role.id} className="rounded-full bg-blue-50 px-3.5 py-1.5 text-[13px] font-bold text-blue-500">
                  {locale === "ar" ? role.name_ar : role.name_en}
                </span>
              ))
            )}
          </div>
          {detail.user_type === "super_admin" ? (
            <p className="rounded-xl bg-warning-tint px-4 py-3 text-[13.5px] text-warning">{t("superAdminAll")}</p>
          ) : permissionsByModule.length === 0 ? (
            <p className="text-[14px] text-brown-300">{t("noPermissions")}</p>
          ) : (
            <div className="space-y-2.5">
              {permissionsByModule.map(({ module, actions }) => (
                <div key={module.key} className="flex flex-wrap items-baseline gap-1.5">
                  <span className="min-w-32 text-[13.5px] font-bold text-brown-500">
                    {locale === "ar" ? module.name_ar : module.name_en}
                  </span>
                  {actions.map((perm) => (
                    <span key={perm.id} className="rounded-md bg-blue-50 px-2 py-0.5 text-[12px] text-blue-500">
                      {t(`actions.${perm.action}` as "actions.view")}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="rounded-2xl border border-line bg-card">
          {activity.length === 0 ? (
            <p className="p-8 text-center text-[14px] text-brown-300">{t("noActivity")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-[13.5px]">
                  <span className="text-[12px] text-brown-300" dir="ltr">
                    {new Date(entry.created_at).toISOString().replace("T", " ").slice(0, 16)}
                  </span>
                  <span className="font-bold text-brown-900">{entry.actor_label}</span>
                  <span className="rounded bg-creamy-200 px-1.5 py-0.5 font-mono text-[12px] text-brown-500" dir="ltr">
                    {entry.action}
                  </span>
                  {entry.target_label ? <span className="text-brown-400">{entry.target_label}</span> : null}
                </li>
              ))}
            </ul>
          )}
          {activityNext ? (
            <button
              type="button"
              onClick={() =>
                userActivity(userId, cursorFrom(activityNext)).then((page) => {
                  setActivity((prev) => [...prev, ...page.results]);
                  setActivityNext(page.next);
                })
              }
              className="block w-full border-t border-line py-3 text-[13px] font-bold text-brown-500 hover:bg-creamy-100"
            >
              {tAudit("loadMore")}
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "sessions" ? (
        <div className="rounded-2xl border border-line bg-card p-6">
          {sessions === null ? (
            <SpinnerIcon className="mx-auto size-5 text-brown-300" />
          ) : sessions.length === 0 ? (
            <p className="text-center text-[14px] text-brown-300">{t("noSessions")}</p>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {sessions.map((session) => (
                  <li key={session.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="text-[13.5px]">
                      <p className="font-bold text-brown-900">{t("sessionStarted")} <RelativeTime iso={session.created_at} /></p>
                      <p className="text-[12px] text-brown-300" dir="ltr">
                        {t("sessionExpires")} {new Date(session.expires_at).toISOString().slice(0, 10)}
                      </p>
                    </div>
                    {manageable && can(me, "users.edit") ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await revokeSession(userId, session.id);
                            setSessions((prev) => prev?.filter((s) => s.id !== session.id) ?? null);
                            toast("success", t("toasts.sessionRevoked"));
                          } catch (error) {
                            toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
                          }
                        }}
                        className="rounded-full border border-danger px-3.5 py-1.5 text-[12.5px] font-bold text-danger hover:bg-danger hover:text-creamy-50"
                      >
                        {t("endSession")}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {manageable && can(me, "users.edit") && sessions.length > 0 ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { revoked } = await revokeAllSessions(userId);
                      setSessions([]);
                      toast("success", t("toasts.allSessionsRevoked", { count: revoked }));
                    } catch (error) {
                      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
                    }
                  }}
                  className="mt-4 rounded-full border border-danger px-5 py-2 text-[13px] font-bold text-danger hover:bg-danger hover:text-creamy-50"
                >
                  {t("endAllSessions")}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {confirm ? (
        <Modal title={t(`confirm.${confirm}.title` as "confirm.deactivate.title")} onClose={() => setConfirm(null)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">
            {t(`confirm.${confirm}.body` as "confirm.deactivate.body", { name: detail.name_ar })}
          </p>
          <ModalActions
            confirmLabel={t(`confirm.${confirm}.cta` as "confirm.deactivate.cta")}
            onConfirm={runConfirm}
            onCancel={() => setConfirm(null)}
            danger={confirm === "deactivate"}
            busy={busy}
          />
        </Modal>
      ) : null}
    </div>
  );
}
