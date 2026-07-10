"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import CopticCross from "@/components/ui/CopticCross";
import SearchableSelect from "@/components/auth/SearchableSelect";
import { SearchIcon, XIcon } from "@/components/articles/icons";

export type ThesisItem = {
  id: string;
  title: string;
  researcher: string;
  institution: string;
  degree: "masters" | "doctorate";
  year: number;
};

type Query = { q: string; degree: string; year: string; sort: string };

const EMPTY: Query = { q: "", degree: "", year: "", sort: "newest" };

export default function ThesesExplorer({ items }: { items: ThesisItem[] }) {
  const t = useTranslations("theses");
  const [query, setQuery] = useState<Query>(EMPTY);
  const searchRef = useRef<HTMLInputElement>(null);

  const years = useMemo(
    () => Array.from(new Set(items.map((x) => x.year))).sort((a, b) => b - a),
    [items],
  );

  const degreeLabel = (d: ThesisItem["degree"]) =>
    d === "doctorate" ? t("degreeDoctorate") : t("degreeMasters");

  const results = useMemo(() => {
    const q = query.q.trim().toLowerCase();
    let out = items.filter((x) => {
      if (query.degree && x.degree !== query.degree) return false;
      if (query.year && String(x.year) !== query.year) return false;
      if (q) {
        const hay = `${x.title} ${x.researcher} ${x.institution}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (query.sort === "title") return a.title.localeCompare(b.title);
      if (query.sort === "oldest") return a.year - b.year;
      return b.year - a.year; // newest
    });
    return out;
  }, [items, query]);

  function patch(p: Partial<Query>) {
    setQuery((prev) => ({ ...prev, ...p }));
  }

  const filtersActive = !!(query.q || query.degree || query.year);

  const stats = [
    { value: items.length, label: t("statTotal") },
    { value: items.filter((x) => x.degree === "doctorate").length, label: t("statDoctorate") },
    { value: items.filter((x) => x.degree === "masters").length, label: t("statMasters") },
  ];

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (query.q) chips.push({ key: "q", label: `"${query.q}"`, clear: () => patch({ q: "" }) });
  if (query.degree) chips.push({ key: "deg", label: degreeLabel(query.degree as ThesisItem["degree"]), clear: () => patch({ degree: "" }) });
  if (query.year) chips.push({ key: "year", label: query.year, clear: () => patch({ year: "" }) });

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-brown-900 text-creamy-100">
        <div aria-hidden className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "url(/Pattern.svg)", backgroundSize: "460px" }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,var(--color-surface),transparent)]" />
        <div className="relative mx-auto max-w-[900px] px-4 pb-24 pt-20 text-center md:pb-28 md:pt-28">
          <p className="mb-5 inline-flex items-center gap-2 font-serif text-[15px] text-creamy-100/70">
            <CopticCross className="size-5 text-red-400" />
            {t("eyebrow")}
          </p>
          <h1 className="text-balance font-serif text-[38px] font-bold leading-[1.25] md:text-[56px]">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-[640px] text-pretty font-serif text-[17px] font-light leading-[1.8] text-creamy-100/75 md:text-[19px]">
            {t("heroSubtitle")}
          </p>

          {/* Search */}
          <div className="relative mx-auto mt-9 max-w-[620px]">
            <SearchIcon className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-brown-300" />
            <input
              ref={searchRef}
              value={query.q}
              onChange={(e) => patch({ q: e.target.value })}
              type="search"
              enterKeyHint="search"
              aria-label={t("searchLabel")}
              placeholder={t("searchPlaceholder")}
              className="h-16 w-full rounded-full border border-creamy-100/15 bg-creamy-50 ps-14 pe-6 font-serif text-[16px] text-brown-900 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.6)] placeholder:text-brown-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-brown-900"
            />
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
        {/* ─── Filter bar ─── */}
        <div className="sticky top-[64px] z-20 -mx-4 mb-8 border-y border-line bg-surface/90 px-4 py-3 backdrop-blur md:mx-0 md:mt-8 md:rounded-2xl md:border md:px-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterSelect
              label={t("degree")} value={query.degree} searchable={false}
              onChange={(v) => patch({ degree: v })} placeholder={t("allDegrees")}
              options={[
                { value: "masters", label: t("degreeMasters") },
                { value: "doctorate", label: t("degreeDoctorate") },
              ]}
            />
            <FilterSelect
              label={t("year")} value={query.year} searchable={false}
              onChange={(v) => patch({ year: v })} placeholder={t("allYears")}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />

            <div className="ms-auto flex items-center gap-2.5">
              <span className="hidden font-sans text-[13px] text-brown-300 sm:inline">{t("sortBy")}</span>
              <FilterSelect
                label={t("sortBy")} value={query.sort} searchable={false} hideLabel
                onChange={(v) => patch({ sort: v || "newest" })} placeholder={t("sortNewest")}
                options={[
                  { value: "newest", label: t("sortNewest") },
                  { value: "oldest", label: t("sortOldest") },
                  { value: "title", label: t("sortTitle") },
                ]}
              />
            </div>
          </div>

          {chips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button key={c.key} type="button" onClick={c.clear}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brown-500/10 py-1 ps-3 pe-2 font-sans text-[12.5px] font-bold text-brown-500 transition-colors hover:bg-brown-500/20">
                  {c.label}
                  <XIcon className="size-3.5" />
                </button>
              ))}
              <button type="button" onClick={() => setQuery(EMPTY)} className="font-sans text-[12.5px] font-bold text-red-700 hover:underline">
                {t("clearFilters")}
              </button>
            </div>
          ) : null}
        </div>

        {/* Results count */}
        <p className="mb-5 font-sans text-[13.5px] text-brown-400" role="status" aria-live="polite">
          {t("resultsCount", { count: results.length })}
        </p>

        {/* Grid */}
        {results.length === 0 ? (
          <EmptyState filtered={filtersActive} onClear={() => setQuery(EMPTY)} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((thesis) => (
              <ThesisCard key={thesis.id} thesis={thesis} degreeLabel={degreeLabel(thesis.degree)} />
            ))}
          </div>
        )}

        <div className="h-20" />
      </div>
    </>
  );
}

/* ── Thesis card ── */
function ThesisCard({ thesis, degreeLabel }: { thesis: ThesisItem; degreeLabel: string }) {
  const t = useTranslations("theses");
  const doctorate = thesis.degree === "doctorate";
  return (
    <article className="group flex flex-col gap-4 rounded-[24px] border border-line bg-card p-6 transition-shadow duration-300 hover:shadow-[0_24px_60px_-32px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between">
        <span className={`w-fit rounded-full px-3.5 py-1 font-serif text-[13px] font-bold text-creamy-50 ${doctorate ? "bg-red-500" : "bg-brown-500"}`}>
          {degreeLabel}
        </span>
        <ScrollIcon className="size-6 text-brown-200" />
      </div>
      <h3 className="flex-1 font-serif text-[17px] font-bold leading-[1.7] text-brown-900">
        {thesis.title}
      </h3>
      <dl className="flex flex-col gap-1.5 border-t border-line pt-4 font-serif text-sm font-light text-brown-600">
        <div className="flex gap-2">
          <dt className="text-brown-300">{t("researcher")}:</dt>
          <dd className="font-normal text-brown-700">{thesis.researcher}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-brown-300">{t("institution")}:</dt>
          <dd>{thesis.institution}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-brown-300">{t("year")}:</dt>
          <dd dir="ltr">{thesis.year}</dd>
        </div>
      </dl>
    </article>
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
  void hideLabel;
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

/* ── Empty state ── */
function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  const t = useTranslations("theses");
  return (
    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-line bg-card py-20 text-center">
      <span aria-hidden className="text-[40px] text-brown-100">✢</span>
      <p className="max-w-sm font-serif text-[17px] font-light text-brown-400">
        {filtered ? t("emptyFiltered") : t("emptyNone")}
      </p>
      {filtered ? (
        <button type="button" onClick={onClear} className="rounded-full bg-brown-500 px-6 py-2.5 font-sans text-[13.5px] font-bold text-creamy-100 hover:bg-brown-600">
          {t("clearFilters")}
        </button>
      ) : null}
    </div>
  );
}

/* ── Scroll / document icon ── */
function ScrollIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M15 2H9a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
      <line x1="10" y1="7" x2="14" y2="7" /><line x1="10" y1="11" x2="14" y2="11" /><line x1="10" y1="15" x2="12.5" y2="15" />
    </svg>
  );
}
