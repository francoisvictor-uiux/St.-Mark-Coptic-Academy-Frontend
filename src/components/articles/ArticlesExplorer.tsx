"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import CopticCross from "@/components/ui/CopticCross";
import SearchableSelect from "@/components/auth/SearchableSelect";
import {
  getFeaturedArticles,
  queryArticles,
  pickLang,
  formatDate,
  type ArticleCard as ArticleData,
  type ArticleFacets,
} from "@/lib/public-content";
import { useBookmarks } from "@/lib/bookmarks";
import ArticleCard, { ArticleCardSkeleton } from "./ArticleCard";
import FeaturedCard from "./FeaturedCard";
import { SearchIcon, SlidersIcon, XIcon, ArrowIcon, ChevronRight } from "./icons";

type Query = {
  q: string; category: string; author: string; year: string;
  tag: string; reading_time: string; sort: string; page: number;
};

const EMPTY: Query = { q: "", category: "", author: "", year: "", tag: "", reading_time: "", sort: "newest", page: 1 };

const EMPTY_FACETS: ArticleFacets = {
  total_articles: 0, categories: [], authors: [], years: [], tags: [], recent: [],
};

export default function ArticlesExplorer() {
  const t = useTranslations("articlesPage");
  const locale = useLocale();
  const { count: bookmarkCount } = useBookmarks();

  const [query, setQuery] = useState<Query>(EMPTY);
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState<ArticleData[]>([]);
  const [facets, setFacets] = useState<ArticleFacets>(EMPTY_FACETS);
  const [featured, setFeatured] = useState<ArticleData[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstLoad = useRef(true);

  const filtersActive = useMemo(
    () => query.category || query.author || query.year || query.tag || query.reading_time || query.q,
    [query],
  );

  const load = useCallback(async (q: Query) => {
    setStatus("loading");
    try {
      const res = await queryArticles({
        q: q.q || undefined, category: q.category || undefined, author: q.author || undefined,
        year: q.year || undefined, tag: q.tag || undefined,
        reading_time: q.reading_time || undefined, sort: q.sort, page: q.page, page_size: 9,
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

  // Featured once
  useEffect(() => {
    getFeaturedArticles().then(setFeatured).catch(() => {});
  }, []);

  // Load whenever query changes
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
  const authorName = (id: string) => {
    const a = facets.authors.find((x) => x.id === id);
    return a ? pickLang(locale, a.name_ar, a.name_en) : id;
  };

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (query.q) chips.push({ key: "q", label: `"${query.q}"`, clear: () => { setSearchInput(""); patch({ q: "" }); } });
  if (query.category) chips.push({ key: "cat", label: catName(query.category), clear: () => patch({ category: "" }) });
  if (query.author) chips.push({ key: "auth", label: authorName(query.author), clear: () => patch({ author: "" }) });
  if (query.year) chips.push({ key: "year", label: query.year, clear: () => patch({ year: "" }) });
  if (query.tag) chips.push({ key: "tag", label: `#${query.tag}`, clear: () => patch({ tag: "" }) });
  if (query.reading_time) chips.push({ key: "rt", label: t(`filters.reading.${query.reading_time}` as "filters.reading.short"), clear: () => patch({ reading_time: "" }) });

  const stats = [
    { value: facets.total_articles, label: t("hero.statArticles") },
    { value: facets.categories.length, label: t("hero.statCategories") },
    { value: facets.authors.length, label: t("hero.statAuthors") },
  ];

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-brown-900 text-creamy-100">
        <div aria-hidden className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(/Pattern.svg)", backgroundSize: "460px" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,var(--color-surface),transparent)]" />
        <div className="relative mx-auto max-w-[900px] px-4 pb-24 pt-20 text-center md:pb-28 md:pt-28">
          <p className="mb-5 inline-flex items-center gap-2 font-serif text-[15px] text-creamy-100/70">
            <CopticCross className="size-5 text-red-400" />
            {t("hero.eyebrow")}
          </p>
          <h1 className="text-balance font-serif text-[38px] font-bold leading-[1.25] md:text-[56px]">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-[620px] text-pretty font-serif text-[17px] font-light leading-[1.8] text-creamy-100/75 md:text-[19px]">
            {t("hero.subtitle")}
          </p>

          {/* Search */}
          <div className="relative mx-auto mt-9 max-w-[620px]">
            <SearchIcon className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-brown-300" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              type="search"
              enterKeyHint="search"
              aria-label={t("hero.searchLabel")}
              placeholder={t("hero.searchPlaceholder")}
              className="h-16 w-full rounded-full border border-creamy-100/15 bg-creamy-50 ps-14 pe-24 font-serif text-[16px] text-brown-900 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)] placeholder:text-brown-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brown-900"
            />
            <kbd className="pointer-events-none absolute end-5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-creamy-200 px-2 py-1 font-sans text-[12px] font-bold text-brown-400 sm:block">
              {t("hero.searchHint")}
            </kbd>
          </div>

          {/* Stats */}
          <dl className="mx-auto mt-10 flex max-w-[520px] items-stretch justify-center divide-x divide-creamy-100/15 rtl:divide-x-reverse">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-1 flex-col items-center gap-1 px-4">
                <dd className="font-archivo text-[32px] font-light leading-none md:text-[42px]" dir="ltr">
                  {s.value}
                </dd>
                <dt className="font-sans text-[12.5px] text-creamy-100/60">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        {/* ─── Featured ─── */}
        {featured.length > 0 && !filtersActive ? (
          <section className="-mt-12 mb-16 md:-mt-16">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-serif text-[24px] font-bold text-brown-900 md:text-[28px]">{t("featured.title")}</h2>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <FeaturedCard article={featured[0]} wide />
              <div className="grid gap-5">
                {featured.slice(1, 3).map((a) => <FeaturedCard key={a.slug} article={a} />)}
              </div>
            </div>
          </section>
        ) : null}

        {/* ─── Filter bar ─── */}
        <div ref={gridRef} className="scroll-mt-24">
          <div className="sticky top-[64px] z-20 -mx-4 mb-6 border-y border-line bg-surface/90 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border md:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Desktop filters */}
              <div className="hidden flex-wrap items-center gap-2.5 lg:flex">
                <FilterSelect label={t("filters.category")} value={query.category}
                  onChange={(v) => patch({ category: v })} placeholder={t("filters.allCategories")}
                  options={facets.categories.map((c) => ({ value: c.slug, label: `${pickLang(locale, c.name_ar, c.name_en)} (${c.count})` }))} />
                <FilterSelect label={t("filters.author")} value={query.author}
                  onChange={(v) => patch({ author: v })} placeholder={t("filters.allAuthors")}
                  options={facets.authors.map((a) => ({ value: a.id, label: `${pickLang(locale, a.name_ar, a.name_en)} (${a.count})` }))} />
                <FilterSelect label={t("filters.year")} value={query.year} searchable={false}
                  onChange={(v) => patch({ year: v })} placeholder={t("filters.allYears")}
                  options={facets.years.map((y) => ({ value: String(y), label: String(y) }))} />
                <FilterSelect label={t("filters.readingTime")} value={query.reading_time} searchable={false}
                  onChange={(v) => patch({ reading_time: v })} placeholder={t("filters.anyLength")}
                  options={["short", "medium", "long"].map((r) => ({ value: r, label: t(`filters.reading.${r}` as "filters.reading.short") }))} />
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

              {/* Sort — always visible, pushed to the end */}
              <div className="ms-auto flex items-center gap-2.5">
                <span className="hidden font-sans text-[13px] text-brown-300 sm:inline">{t("filters.sortBy")}</span>
                <FilterSelect label={t("filters.sortBy")} value={query.sort} searchable={false} hideLabel
                  onChange={(v) => patch({ sort: v || "newest" })} placeholder={t("filters.sort.newest")}
                  options={["newest", "oldest", "popular", "updated", "alphabetical"].map((s) => ({ value: s, label: t(`filters.sort.${s}` as "filters.sort.newest") }))} />
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

          {/* ─── Grid + sidebar ─── */}
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>
              {/* Results count */}
              <p className="mb-5 font-sans text-[13.5px] text-brown-400" role="status" aria-live="polite">
                {status === "ready" ? t("results.count", { count: total }) : t("results.loading")}
              </p>

              {status === "error" ? (
                <ErrorState onRetry={() => load(query)} />
              ) : status === "loading" ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <ArticleCardSkeleton key={i} />)}
                </div>
              ) : results.length === 0 ? (
                <EmptyState filtered={!!filtersActive} onClear={clearAll} />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((a) => <ArticleCard key={a.slug} article={a} />)}
                </div>
              )}

              {/* Pagination */}
              {status === "ready" && pages > 1 ? (
                <Pagination page={query.page} pages={pages} onGo={(p) => patch({ page: p })} />
              ) : null}
            </div>

            {/* Sidebar */}
            <Sidebar facets={facets} query={query} patch={patch} bookmarkCount={bookmarkCount} />
          </div>
        </div>

        {/* ─── Newsletter CTA ─── */}
        <NewsletterCTA />
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

/* ── Filter select wrapper (compact, label-less trigger) ── */
function FilterSelect({
  label, hideLabel, value, onChange, options, placeholder, searchable = true,
}: {
  label: string; hideLabel?: boolean; value: string;
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
  const t = useTranslations("articlesPage");
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
  facets, query, patch, bookmarkCount,
}: {
  facets: ArticleFacets; query: Query; patch: (p: Partial<Query>) => void; bookmarkCount: number;
}) {
  const t = useTranslations("articlesPage");
  const locale = useLocale();
  return (
    <aside className="hidden flex-col gap-8 lg:flex">
      {bookmarkCount > 0 ? (
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="font-sans text-[13px] text-brown-400">{t("sidebar.saved", { count: bookmarkCount })}</p>
        </div>
      ) : null}

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

      {facets.authors.length > 0 ? (
        <SidebarBlock title={t("sidebar.authors")}>
          <ul className="flex flex-col gap-1.5">
            {facets.authors.slice(0, 6).map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => patch({ author: query.author === a.id ? "" : a.id })}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-creamy-200">
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-creamy-400 font-serif text-[13px] font-bold text-brown-500">
                    {pickLang(locale, a.name_ar, a.name_en).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate font-sans text-[13px] ${query.author === a.id ? "font-bold text-brown-900" : "text-brown-700"}`}>
                      {pickLang(locale, a.name_ar, a.name_en)}
                    </span>
                    <span className="font-sans text-[11.5px] text-brown-300">{t("sidebar.articleCount", { count: a.count })}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SidebarBlock>
      ) : null}

      {facets.tags.length > 0 ? (
        <SidebarBlock title={t("sidebar.tags")}>
          <div className="flex flex-wrap gap-2">
            {facets.tags.slice(0, 14).map((tg) => (
              <button key={tg.tag} type="button" onClick={() => patch({ tag: query.tag === tg.tag ? "" : tg.tag })}
                className={`rounded-full px-3 py-1 font-sans text-[12.5px] transition-colors ${
                  query.tag === tg.tag ? "bg-brown-500 text-creamy-50" : "bg-creamy-200 text-brown-500 hover:bg-creamy-300"
                }`}>
                #{tg.tag}
              </button>
            ))}
          </div>
        </SidebarBlock>
      ) : null}

      {facets.recent.length > 0 ? (
        <SidebarBlock title={t("sidebar.recent")}>
          <ul className="flex flex-col divide-y divide-line">
            {facets.recent.slice(0, 5).map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="group flex flex-col gap-1 py-2.5">
                  <span className="font-serif text-[13.5px] font-bold leading-[1.5] text-brown-900 transition-colors group-hover:text-brown-500">
                    {pickLang(locale, a.title_ar, a.title_en)}
                  </span>
                  <span className="font-sans text-[11.5px] text-brown-300">{formatDate(locale, a.published_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
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
  const t = useTranslations("articlesPage");
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
  const t = useTranslations("articlesPage");
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
  facets: ArticleFacets; query: Query; patch: (p: Partial<Query>) => void;
  onClose: () => void; onClear: () => void; chipsCount: number;
}) {
  const t = useTranslations("articlesPage");
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
          <MobileGroup title={t("filters.category")}>
            {facets.categories.map((c) => (
              <Choice key={c.slug} active={query.category === c.slug} onClick={() => patch({ category: query.category === c.slug ? "" : c.slug })}
                label={pickLang(locale, c.name_ar, c.name_en)} count={c.count} />
            ))}
          </MobileGroup>
          <MobileGroup title={t("filters.year")}>
            {facets.years.map((y) => (
              <Choice key={y} active={query.year === String(y)} onClick={() => patch({ year: query.year === String(y) ? "" : String(y) })} label={String(y)} />
            ))}
          </MobileGroup>
          <MobileGroup title={t("filters.readingTime")}>
            {["short", "medium", "long"].map((r) => (
              <Choice key={r} active={query.reading_time === r} onClick={() => patch({ reading_time: query.reading_time === r ? "" : r })}
                label={t(`filters.reading.${r}` as "filters.reading.short")} />
            ))}
          </MobileGroup>
          {facets.tags.length > 0 ? (
            <MobileGroup title={t("sidebar.tags")}>
              {facets.tags.slice(0, 16).map((tg) => (
                <Choice key={tg.tag} active={query.tag === tg.tag} onClick={() => patch({ tag: query.tag === tg.tag ? "" : tg.tag })} label={`#${tg.tag}`} />
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

/* ── Newsletter ── */
function NewsletterCTA() {
  const t = useTranslations("articlesPage");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="my-20 overflow-hidden rounded-[32px] border border-line bg-brown-500 px-6 py-14 text-center text-creamy-100 md:px-14 md:py-16">
      <div aria-hidden className="mx-auto mb-4 text-[13px] tracking-[10px] text-creamy-100/40">✢ ✦ ✢</div>
      <h2 className="text-balance font-serif text-[26px] font-bold md:text-[32px]">{t("newsletter.title")}</h2>
      <p className="mx-auto mt-3 max-w-[480px] font-serif text-[16px] font-light text-creamy-100/75">{t("newsletter.subtitle")}</p>
      {done ? (
        <p className="mt-6 font-serif text-[16px] text-creamy-100" role="status">{t("newsletter.thanks")}</p>
      ) : (
        <form className="mx-auto mt-7 flex max-w-[460px] flex-col gap-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) setDone(true); }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" required
            aria-label={t("newsletter.emailLabel")} placeholder={t("newsletter.placeholder")}
            className="h-13 flex-1 rounded-full bg-creamy-50 px-5 py-3.5 font-serif text-[15px] text-brown-900 placeholder:text-brown-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brown-500" />
          <button type="submit" className="rounded-full bg-red-500 px-7 py-3.5 font-sans text-[14.5px] font-bold text-creamy-50 transition-colors hover:bg-red-600">
            {t("newsletter.cta")}
          </button>
        </form>
      )}
    </section>
  );
}
