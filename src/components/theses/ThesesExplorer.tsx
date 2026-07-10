"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import CopticCross from "@/components/ui/CopticCross";
import SearchableSelect from "@/components/auth/SearchableSelect";
import {
  queryTheses,
  pickLang,
  type ThesisCard as ThesisData,
  type ThesisFacets,
} from "@/lib/public-content";
import ThesisCard, { ThesisCardSkeleton } from "./ThesisCard";
import { SearchIcon, SlidersIcon, XIcon, ChevronRight } from "./icons";

type Query = {
  q: string; category: string; degree: string; year: string;
  keyword: string; sort: string; page: number;
};

const EMPTY: Query = { q: "", category: "", degree: "", year: "", keyword: "", sort: "newest", page: 1 };

const EMPTY_FACETS: ThesisFacets = {
  total_theses: 0, categories: [], degrees: [], years: [], keywords: [],
};

export default function ThesesExplorer() {
  const t = useTranslations("thesesPage");
  const locale = useLocale();

  const [query, setQuery] = useState<Query>(EMPTY);
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<ThesisData[]>([]);
  const [facets, setFacets] = useState<ThesisFacets>(EMPTY_FACETS);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstLoad = useRef(true);

  const filtersActive = useMemo(
    () => query.category || query.degree || query.year || query.keyword || query.q,
    [query],
  );

  const load = useCallback(async (q: Query) => {
    setStatus("loading");
    try {
      const res = await queryTheses({
        q: q.q || undefined, category: q.category || undefined, degree: q.degree || undefined,
        year: q.year || undefined, keyword: q.keyword || undefined,
        sort: q.sort, page: q.page, page_size: 9,
      });
      setResults(res.results);
      setFacets(res.facets);
      setPages(res.pages);
      setTotal(res.total);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load(query);
    if (!firstLoad.current) {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    firstLoad.current = false;
  }, [query, load]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery((q) => (q.q === searchInput.trim() ? q : { ...q, q: searchInput.trim(), page: 1 }));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // "/" focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function patch(p: Partial<Query>) {
    setQuery((q) => ({ ...q, ...p, page: p.page ?? 1 }));
  }

  function clearAll() {
    setSearchInput("");
    setQuery({ ...EMPTY });
  }

  const catName = (slug: string) => {
    const c = facets.categories.find((x) => x.slug === slug);
    return c ? pickLang(locale, c.name_ar, c.name_en) : slug;
  };
  const degreeName = (d: string) => t(`degree.${d}` as "degree.masters");

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (query.q) chips.push({ key: "q", label: `"${query.q}"`, clear: () => { setSearchInput(""); patch({ q: "" }); } });
  if (query.category) chips.push({ key: "cat", label: catName(query.category), clear: () => patch({ category: "" }) });
  if (query.degree) chips.push({ key: "deg", label: degreeName(query.degree), clear: () => patch({ degree: "" }) });
  if (query.year) chips.push({ key: "year", label: query.year, clear: () => patch({ year: "" }) });
  if (query.keyword) chips.push({ key: "kw", label: `#${query.keyword}`, clear: () => patch({ keyword: "" }) });

  const stats = [
    { value: facets.total_theses, label: t("hero.statTheses") },
    { value: facets.categories.length, label: t("hero.statCategories") },
    { value: facets.years.length, label: t("hero.statYears") },
  ];

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-surface text-brown-900">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/books-hero.svg" alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-surface from-[6%] via-surface/45 via-[45%] to-surface" />
        </div>
        <div className="relative mx-auto max-w-[900px] px-4 pb-14 pt-8 text-center md:pb-16 md:pt-10">
          <p className="mb-5 inline-flex items-center gap-2 font-serif text-[15px] text-brown-400">
            <CopticCross className="size-5 text-red-500" />
            {t("hero.eyebrow")}
          </p>
          <h1 className="text-balance font-display text-[38px] font-bold leading-[1.25] text-brown-900 md:text-[56px]">
            {t("hero.title")}
          </h1>

          {/* Search */}
          <div className="relative mx-auto mt-8 max-w-[620px]">
            <SearchIcon className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-brown-300" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              type="search"
              enterKeyHint="search"
              aria-label={t("hero.searchLabel")}
              placeholder={t("hero.searchPlaceholder")}
              className="h-16 w-full rounded-full border border-line bg-creamy-50 ps-14 pe-24 font-serif text-[16px] text-brown-900 placeholder:text-brown-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            />
            <kbd className="pointer-events-none absolute end-5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-creamy-200 px-2 py-1 font-sans text-[12px] font-bold text-brown-400 sm:block">
              {t("hero.searchHint")}
            </kbd>
          </div>

          {/* Stats */}
          <dl className="mx-auto mt-9 flex max-w-[520px] items-stretch justify-center divide-x divide-line rtl:divide-x-reverse">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col items-center gap-1 px-4">
                <dd className="font-archivo text-[32px] font-light leading-none text-brown-900 md:text-[42px]" dir="ltr">
                  {s.value}
                </dd>
                <dt className="font-sans text-[12.5px] text-brown-300">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        {/* ─── Filter bar ─── */}
        <div className="mt-8 mb-8">
          <div className="rounded-2xl border border-line bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Desktop filters */}
              <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
                <FilterSelect label={t("filters.category")} value={query.category}
                  onChange={(v) => patch({ category: v })} placeholder={t("filters.allCategories")}
                  options={facets.categories.map((c) => ({ value: c.slug, label: `${pickLang(locale, c.name_ar, c.name_en)} (${c.count})` }))} />
                <FilterSelect label={t("filters.degree")} value={query.degree} searchable={false}
                  onChange={(v) => patch({ degree: v })} placeholder={t("filters.allDegrees")}
                  options={facets.degrees.map((d) => ({ value: d.degree, label: `${degreeName(d.degree)} (${d.count})` }))} />
                <FilterSelect label={t("filters.year")} value={query.year} searchable={false}
                  onChange={(v) => patch({ year: v })} placeholder={t("filters.allYears")}
                  options={facets.years.map((y) => ({ value: String(y), label: String(y) }))} />
              </div>

              {/* Mobile filter trigger */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 font-sans text-[13.5px] font-bold text-brown-500 lg:hidden"
              >
                <SlidersIcon className="size-4" />
                {t("filters.filters")}
                {chips.length > 0 ? <span className="flex size-5 items-center justify-center rounded-full bg-brown-500 text-[11px] text-creamy-50">{chips.length}</span> : null}
              </button>

              {/* Sort */}
              <div className="ms-auto flex items-center gap-2.5">
                <span className="hidden font-sans text-[13px] text-brown-300 sm:inline">{t("filters.sortBy")}</span>
                <FilterSelect label={t("filters.sortBy")} value={query.sort} searchable={false}
                  onChange={(v) => patch({ sort: v || "newest" })} placeholder={t("filters.sort.newest")}
                  options={["newest", "oldest", "updated", "alphabetical"].map((s) => ({ value: s, label: t(`filters.sort.${s}` as "filters.sort.newest") }))} />
              </div>
            </div>

            {/* Active chips */}
            {chips.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <button key={c.key} type="button" onClick={c.clear}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brown-500/10 py-1 ps-3 pe-2 font-sans text-[12.5px] font-bold text-brown-500 transition-colors hover:bg-brown-500/20">
                    {c.label}
                    <XIcon className="size-3.5" />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="font-sans text-[12.5px] font-bold text-red-700 hover:underline">
                  {t("filters.clearAll")}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* ─── Results ─── */}
        <div ref={gridRef} className="scroll-mt-[104px] md:scroll-mt-[120px]">
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>
              <p className="mb-5 font-sans text-[13.5px] text-brown-400" role="status" aria-live="polite">
                {status === "ready" ? t("results.count", { count: total }) : t("results.loading")}
              </p>

              {status === "error" ? (
                <ErrorState onRetry={() => load(query)} />
              ) : status === "loading" ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <ThesisCardSkeleton key={i} />)}
                </div>
              ) : results.length === 0 ? (
                <EmptyState filtered={!!filtersActive} onClear={clearAll} />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((th) => <ThesisCard key={th.id} thesis={th} />)}
                </div>
              )}

              {status === "ready" && pages > 1 ? (
                <Pagination page={query.page} pages={pages} onGo={(p) => patch({ page: p })} />
              ) : null}
            </div>

            <Sidebar facets={facets} query={query} patch={patch} />
          </div>
        </div>
      </div>

      {/* ─── Mobile filter drawer ─── */}
      {drawerOpen ? (
        <MobileFilters
          facets={facets} query={query} patch={patch} onClose={() => setDrawerOpen(false)}
          onClear={clearAll} chipsCount={chips.length}
        />
      ) : null}
    </>
  );
}

/* ── Filter select ── */
function FilterSelect({
  label, value, onChange, options, placeholder, searchable = true,
}: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  options: { value: string; label: string }[]; searchable?: boolean;
}) {
  return (
    <SearchableSelect
      size="sm"
      searchable={searchable}
      className="min-w-[150px]"
      ariaLabel={label}
      placeholder={placeholder}
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      options={[{ value: "", label: placeholder }, ...options]}
    />
  );
}

/* ── Pagination ── */
function Pagination({ page, pages, onGo }: { page: number; pages: number; onGo: (p: number) => void }) {
  const t = useTranslations("thesesPage");
  const nums = pageWindow(page, pages);
  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label={t("pagination.label")}>
      <button type="button" disabled={page <= 1} onClick={() => onGo(page - 1)}
        className="flex h-10 items-center gap-1 rounded-xl border border-line px-3 font-sans text-[13.5px] font-bold text-brown-500 transition-colors hover:border-brown-400 disabled:opacity-40">
        <ChevronRight className="size-4 rotate-180 rtl:rotate-0" /> {t("pagination.prev")}
      </button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`gap-${i}`} className="px-2 font-sans text-brown-300">…</span>
        ) : (
          <button key={n} type="button" onClick={() => onGo(n)} aria-current={n === page ? "page" : undefined}
            className={`flex size-10 items-center justify-center rounded-xl font-sans text-[14px] font-bold transition-colors ${
              n === page ? "bg-brown-500 text-creamy-50" : "border border-line text-brown-500 hover:border-brown-400"
            }`}>
            {n}
          </button>
        ),
      )}
      <button type="button" disabled={page >= pages} onClick={() => onGo(page + 1)}
        className="flex h-10 items-center gap-1 rounded-xl border border-line px-3 font-sans text-[13.5px] font-bold text-brown-500 transition-colors hover:border-brown-400 disabled:opacity-40">
        {t("pagination.next")} <ChevronRight className="size-4 rtl:rotate-180" />
      </button>
    </nav>
  );
}

function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, page - 1), hi = Math.min(pages - 1, page + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

/* ── Sidebar ── */
function Sidebar({
  facets, query, patch,
}: {
  facets: ThesisFacets; query: Query; patch: (p: Partial<Query>) => void;
}) {
  const t = useTranslations("thesesPage");
  const locale = useLocale();
  return (
    <aside className="hidden flex-col gap-8 lg:flex">
      {facets.categories.length > 0 ? (
        <SidebarBlock title={t("sidebar.categories")}>
          <ul className="flex flex-col gap-1">
            {facets.categories.slice(0, 8).map((c) => (
              <li key={c.slug}>
                <button type="button" onClick={() => patch({ category: query.category === c.slug ? "" : c.slug })}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 font-sans text-[13.5px] transition-colors ${
                    query.category === c.slug ? "bg-brown-500/10 font-bold text-brown-500" : "text-brown-500 hover:bg-creamy-200"
                  }`}>
                  <span>{pickLang(locale, c.name_ar, c.name_en)}</span>
                  <span className="font-archivo text-[12px] text-brown-300" dir="ltr">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </SidebarBlock>
      ) : null}

      {facets.degrees.length > 0 ? (
        <SidebarBlock title={t("sidebar.degrees")}>
          <ul className="flex flex-col gap-1">
            {facets.degrees.map((d) => (
              <li key={d.degree}>
                <button type="button" onClick={() => patch({ degree: query.degree === d.degree ? "" : d.degree })}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 font-sans text-[13.5px] transition-colors ${
                    query.degree === d.degree ? "bg-brown-500/10 font-bold text-brown-500" : "text-brown-500 hover:bg-creamy-200"
                  }`}>
                  <span>{t(`degree.${d.degree}` as "degree.masters")}</span>
                  <span className="font-archivo text-[12px] text-brown-300" dir="ltr">{d.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </SidebarBlock>
      ) : null}

      {facets.keywords.length > 0 ? (
        <SidebarBlock title={t("sidebar.keywords")}>
          <div className="flex flex-wrap gap-2">
            {facets.keywords.slice(0, 16).map((kw) => (
              <button key={kw.keyword} type="button" onClick={() => patch({ keyword: query.keyword === kw.keyword ? "" : kw.keyword })}
                className={`rounded-full px-3 py-1 font-sans text-[12.5px] transition-colors ${
                  query.keyword === kw.keyword ? "bg-brown-500 text-creamy-50" : "bg-creamy-200 text-brown-500 hover:bg-creamy-300"
                }`}>
                #{kw.keyword}
              </button>
            ))}
          </div>
        </SidebarBlock>
      ) : null}
    </aside>
  );
}

function SidebarBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-sans text-[12px] font-bold uppercase tracking-wider text-brown-300">{title}</h3>
      {children}
    </section>
  );
}

/* ── States ── */
function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  const t = useTranslations("thesesPage");
  return (
    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-line bg-card py-20 text-center">
      <span aria-hidden className="text-[40px] text-brown-100">✢</span>
      <p className="max-w-sm font-serif text-[17px] font-light text-brown-400">
        {filtered ? t("empty.filtered") : t("empty.none")}
      </p>
      {filtered ? (
        <button type="button" onClick={onClear} className="rounded-full bg-brown-500 px-6 py-2.5 font-sans text-[13.5px] font-bold text-creamy-100 hover:bg-brown-600">
          {t("empty.clear")}
        </button>
      ) : null}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("thesesPage");
  return (
    <div className="flex flex-col items-center gap-3 rounded-[24px] border border-danger/30 bg-danger-tint py-16 text-center">
      <p className="font-serif text-[16px] text-danger">{t("error.text")}</p>
      <button type="button" onClick={onRetry} className="rounded-full border border-danger px-5 py-2 font-sans text-[13px] font-bold text-danger hover:bg-danger hover:text-creamy-50">
        {t("error.retry")}
      </button>
    </div>
  );
}

/* ── Mobile filter drawer ── */
function MobileFilters({
  facets, query, patch, onClose, onClear, chipsCount,
}: {
  facets: ThesisFacets; query: Query; patch: (p: Partial<Query>) => void;
  onClose: () => void; onClear: () => void; chipsCount: number;
}) {
  const t = useTranslations("thesesPage");
  const locale = useLocale();
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-brown-900/40" onPointerDown={onClose} />
      <div role="dialog" aria-modal="true" aria-label={t("filters.filters")}
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-card p-6">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-line" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-[20px] font-bold text-brown-900">{t("filters.filters")}</h2>
          <button type="button" onClick={onClose} aria-label={t("filters.close")} className="flex size-9 items-center justify-center rounded-lg text-brown-300 hover:bg-creamy-200">
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {facets.categories.length > 0 ? (
            <MobileGroup title={t("filters.category")}>
              {facets.categories.map((c) => (
                <Choice key={c.slug} active={query.category === c.slug} onClick={() => patch({ category: query.category === c.slug ? "" : c.slug })}
                  label={pickLang(locale, c.name_ar, c.name_en)} count={c.count} />
              ))}
            </MobileGroup>
          ) : null}
          <MobileGroup title={t("filters.degree")}>
            {facets.degrees.map((d) => (
              <Choice key={d.degree} active={query.degree === d.degree} onClick={() => patch({ degree: query.degree === d.degree ? "" : d.degree })}
                label={t(`degree.${d.degree}` as "degree.masters")} count={d.count} />
            ))}
          </MobileGroup>
          <MobileGroup title={t("filters.year")}>
            {facets.years.map((y) => (
              <Choice key={y} active={query.year === String(y)} onClick={() => patch({ year: query.year === String(y) ? "" : String(y) })} label={String(y)} />
            ))}
          </MobileGroup>
          {facets.keywords.length > 0 ? (
            <MobileGroup title={t("sidebar.keywords")}>
              {facets.keywords.slice(0, 16).map((kw) => (
                <Choice key={kw.keyword} active={query.keyword === kw.keyword} onClick={() => patch({ keyword: query.keyword === kw.keyword ? "" : kw.keyword })} label={`#${kw.keyword}`} />
              ))}
            </MobileGroup>
          ) : null}
        </div>

        <div className="sticky bottom-0 mt-6 flex gap-3 bg-card pt-3">
          {chipsCount > 0 ? (
            <button type="button" onClick={onClear} className="rounded-full border border-line px-5 py-3 font-sans text-[14px] font-bold text-brown-500">
              {t("filters.clearAll")}
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="flex-1 rounded-full bg-brown-500 py-3 font-sans text-[14px] font-bold text-creamy-100">
            {t("filters.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 font-sans text-[12px] font-bold uppercase tracking-wider text-brown-300">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Choice({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-sans text-[13px] transition-colors ${
        active ? "border-brown-500 bg-brown-500 text-creamy-50" : "border-line bg-creamy-50 text-brown-500 hover:border-brown-400"
      }`}>
      {label}
      {count !== undefined ? <span className="font-archivo text-[11px] opacity-70" dir="ltr">{count}</span> : null}
    </button>
  );
}
