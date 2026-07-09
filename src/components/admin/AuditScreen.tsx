"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  auditList,
  permissionCatalog,
  type AuditEntry,
  type CatalogModule,
} from "@/lib/admin-api";
import { ChevronDownIcon } from "@/components/auth/icons";
import SearchableSelect from "@/components/auth/SearchableSelect";
import { cursorFrom, EmptyState, ErrorCard, SkeletonRows } from "./ui";

const selectCls =
  "h-10 rounded-xl border border-line bg-creamy-50 px-3 text-[13.5px] text-brown-900 focus:border-brown-400 focus:outline-none";

/** Render a before/after payload as a readable diff table (spec ADM-06 §9). */
function DiffTable({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const t = useTranslations("admin.audit");
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (keys.length === 0) return null;
  const show = (v: unknown) =>
    v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return (
    <table className="mt-2 w-full max-w-xl text-[12.5px]">
      <thead>
        <tr className="text-[11px] text-brown-300">
          <th className="px-2 py-1 text-start font-bold">{t("diff.field")}</th>
          <th className="px-2 py-1 text-start font-bold">{t("diff.before")}</th>
          <th className="px-2 py-1 text-start font-bold">{t("diff.after")}</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => (
          <tr key={key} className="border-t border-line">
            <td className="px-2 py-1.5 font-bold text-brown-500" dir="ltr">{key}</td>
            <td className="px-2 py-1.5 text-danger" dir="auto">{show(before?.[key])}</td>
            <td className="px-2 py-1.5 text-success" dir="auto">{show(after?.[key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** ADM-06 — audit log. */
export default function AuditScreen() {
  const t = useTranslations("admin.audit");
  const locale = useLocale();

  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(
    async (opts: { cursor?: string; append?: boolean } = {}) => {
      if (!opts.append) setState("loading");
      else setLoadingMore(true);
      try {
        const page = await auditList({
          module: moduleFilter || undefined,
          action: actionFilter.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          cursor: opts.cursor,
        });
        setRows((prev) => (opts.append ? [...prev, ...page.results] : page.results));
        setNext(page.next);
        setState("ready");
      } catch {
        if (!opts.append) setState("error");
      } finally {
        setLoadingMore(false);
      }
    },
    [moduleFilter, actionFilter, from, to],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [load]);

  useEffect(() => {
    permissionCatalog().then((r) => setModules(r.modules)).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="mb-1 font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
      <p className="mb-5 text-[13px] text-brown-300">{t("subtitle")}</p>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchableSelect
          size="sm"
          className="w-52"
          ariaLabel={t("filters.module")}
          placeholder={t("filters.allModules")}
          value={moduleFilter}
          onChange={(v) => setModuleFilter(v ?? "")}
          options={[
            { value: "", label: t("filters.allModules") },
            ...modules.map((mod) => ({
              value: mod.key,
              label: locale === "ar" ? mod.name_ar : mod.name_en,
            })),
          ]}
        />
        <input
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder={t("filters.actionPlaceholder")}
          dir="ltr"
          className="h-10 w-44 rounded-xl border border-line bg-creamy-50 px-3 text-[13px] placeholder:text-brown-200 focus:border-brown-400 focus:outline-none"
        />
        <input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} aria-label={t("filters.from")} />
        <span className="text-[13px] text-brown-300">–</span>
        <input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} aria-label={t("filters.to")} />
      </div>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={() => load()} retryLabel={t("retry")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <table className="w-full text-[13px]">
            <tbody>
              {state === "loading" ? (
                <SkeletonRows rows={10} cols={4} />
              ) : rows.length === 0 ? (
                <tr>
                  <td>
                    <EmptyState text={t("empty")} />
                  </td>
                </tr>
              ) : (
                rows.map((entry) => {
                  const open = expanded === entry.id;
                  const hasDetail = entry.before || entry.after || entry.ip;
                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        className={`border-t border-line ${hasDetail ? "cursor-pointer hover:bg-creamy-100" : ""}`}
                        onClick={() => hasDetail && setExpanded(open ? null : entry.id)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[12px] text-brown-300" dir="ltr">
                          {new Date(entry.created_at).toISOString().replace("T", " ").slice(0, 19)}
                        </td>
                        <td className="px-4 py-3 font-bold text-brown-900">{entry.actor_label}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-creamy-200 px-1.5 py-0.5 font-mono text-[12px] text-brown-500" dir="ltr">
                            {entry.action}
                          </span>
                          {entry.target_label ? (
                            <span className="ms-2 text-brown-400">{entry.target_label}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {entry.module ? (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] text-blue-500">{entry.module}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-brown-300">
                          {hasDetail ? (
                            <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                          ) : null}
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-t border-line bg-creamy-100">
                          <td colSpan={5} className="px-6 py-4">
                            <DiffTable before={entry.before} after={entry.after} />
                            <p className="mt-3 text-[12px] text-brown-300" dir="ltr">
                              {entry.ip ?? "—"} · {entry.user_agent.slice(0, 110)}
                            </p>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          {next && state === "ready" ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => load({ cursor: cursorFrom(next), append: true })}
              className="block w-full border-t border-line py-3 text-[13px] font-bold text-brown-500 hover:bg-creamy-100 disabled:opacity-50"
            >
              {loadingMore ? t("loading") : t("loadMore")}
            </button>
          ) : null}
        </div>
      )}

      <p className="mt-4 text-center text-[12px] text-brown-200">{t("retention")}</p>
    </div>
  );
}
