"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import { listNews, type NewsItem } from "@/lib/content-api";
import SearchableSelect from "@/components/auth/SearchableSelect";
import { ContentStatusBadge } from "./ArticlesScreen";
import { cursorFrom, EmptyState, ErrorCard, RelativeTime, SkeletonRows } from "./ui";

export default function NewsScreen() {
  const t = useTranslations("admin.news");
  const router = useRouter();
  const { user: me } = useAuth();

  const [rows, setRows] = useState<NewsItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(
    async (opts: { cursor?: string; append?: boolean } = {}) => {
      if (!opts.append) setState("loading");
      try {
        const page = await listNews({
          q: q.trim() || undefined,
          status: statusFilter || undefined,
          cursor: opts.cursor,
        });
        setRows((prev) => (opts.append ? [...prev, ...page.results] : page.results));
        setNext(page.next);
        setState("ready");
      } catch {
        if (!opts.append) setState("error");
      }
    },
    [q, statusFilter],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(), 300);
    return () => clearTimeout(debounceRef.current);
  }, [load]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
        {can(me, "news.create") ? (
          <button
            type="button"
            onClick={() => router.push("/admin/news/new")}
            className="rounded-full bg-brown-500 px-5 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600"
          >
            {t("create")}
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 w-full max-w-xs rounded-xl border border-line bg-creamy-50 px-4 text-[13.5px] placeholder:text-brown-200 focus:border-brown-400 focus:outline-none"
        />
        <SearchableSelect
          size="sm"
          searchable={false}
          className="w-40"
          ariaLabel={t("filters.status")}
          placeholder={t("filters.allStatuses")}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? "")}
          options={[
            { value: "", label: t("filters.allStatuses") },
            { value: "draft", label: t("filters.draft") },
            { value: "published", label: t("filters.published") },
            { value: "archived", label: t("filters.archived") },
          ]}
        />
      </div>

      {state === "error" ? (
        <ErrorCard text={t("errors.load")} onRetry={() => load()} retryLabel={t("retry")} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[560px] text-[13.5px]">
            <thead>
              <tr className="text-[12px] text-brown-300">
                <th className="px-4 py-3 text-start font-bold">{t("columns.title")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.status")}</th>
                <th className="px-4 py-3 text-start font-bold">{t("columns.updated")}</th>
              </tr>
            </thead>
            <tbody>
              {state === "loading" ? (
                <SkeletonRows rows={6} cols={3} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <EmptyState text={t("empty")} />
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/admin/news/${item.id}`)}
                    className="cursor-pointer border-t border-line transition-colors hover:bg-creamy-100"
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        {item.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.cover.url} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-creamy-300 text-brown-300">✢</span>
                        )}
                        <span className="font-bold text-brown-900">{item.title_ar}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><ContentStatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-brown-400"><RelativeTime iso={item.updated_at} /></td>
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
    </div>
  );
}
