"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickLang, type ThesisCard as ThesisData } from "@/lib/public-content";
import { DownloadIcon, DocumentIcon } from "./icons";

export default function ThesisCard({ thesis }: { thesis: ThesisData }) {
  const t = useTranslations("thesesPage");
  const locale = useLocale();

  const title = pickLang(locale, thesis.title_ar, thesis.title_en);
  const researcher = pickLang(locale, thesis.researcher_ar, thesis.researcher_en);
  const institution = pickLang(locale, thesis.institution_ar, thesis.institution_en);
  const abstract = pickLang(locale, thesis.abstract_ar, thesis.abstract_en);
  const degreeLabel = t(`degree.${thesis.degree}` as "degree.masters");

  return (
    <article className="group flex flex-col gap-4 rounded-[24px] border border-line bg-card p-6 transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(86,40,35,0.15)]">
      {/* Top row: degree badge + category */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-[12px] font-bold ${
            thesis.degree === "doctorate"
              ? "bg-red-500/10 text-red-700"
              : "bg-brown-500/10 text-brown-500"
          }`}
        >
          <DocumentIcon className="size-3.5" />
          {degreeLabel}
        </span>
        {thesis.category ? (
          <span className="rounded-full bg-creamy-200 px-3 py-1 font-sans text-[12px] font-bold text-brown-400">
            {pickLang(locale, thesis.category.name_ar, thesis.category.name_en)}
          </span>
        ) : null}
        <span className="ms-auto font-archivo text-[13px] font-bold text-brown-300" dir="ltr">
          {thesis.year}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-serif text-[18px] font-bold leading-[1.6] text-brown-900 transition-colors group-hover:text-brown-500">
        {title}
      </h3>

      {/* Abstract (optional) */}
      {abstract ? (
        <p className="line-clamp-2 font-serif text-[14px] font-light leading-[1.7] text-brown-400">
          {abstract}
        </p>
      ) : null}

      {/* Researcher + institution */}
      <dl className="mt-auto flex flex-col gap-1.5 border-t border-line pt-4 font-serif text-[13.5px] text-brown-500">
        <div className="flex gap-1.5">
          <dt className="text-brown-300">{t("card.researcher")}:</dt>
          <dd className="font-bold">{researcher}</dd>
        </div>
        {institution ? (
          <div className="flex gap-1.5">
            <dt className="text-brown-300">{t("card.institution")}:</dt>
            <dd className="min-w-0 truncate">{institution}</dd>
          </div>
        ) : null}
      </dl>

      {/* Keywords */}
      {thesis.keywords.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {thesis.keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="rounded-full bg-creamy-200 px-2.5 py-0.5 font-sans text-[11.5px] text-brown-400"
            >
              #{kw}
            </span>
          ))}
        </div>
      ) : null}

      {/* Download / read */}
      {thesis.file_url ? (
        <a
          href={thesis.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-brown-500 px-4 py-2 font-sans text-[13px] font-bold text-creamy-50 transition-colors hover:bg-brown-600"
        >
          <DownloadIcon className="size-4" />
          {t("card.download")}
        </a>
      ) : (
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2 font-sans text-[13px] font-bold text-brown-300">
          {t("card.noFile")}
        </span>
      )}
    </article>
  );
}

export function ThesisCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-line bg-card p-6">
      <div className="flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-creamy-300" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-creamy-300" />
      </div>
      <div className="h-4 w-4/5 animate-pulse rounded bg-creamy-400" />
      <div className="h-3 w-full animate-pulse rounded bg-creamy-300" />
      <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
        <div className="h-3 w-2/3 animate-pulse rounded bg-creamy-300" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-creamy-300" />
      </div>
    </div>
  );
}
