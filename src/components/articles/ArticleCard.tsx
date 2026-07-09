"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickLang, formatDate, type ArticleCard as ArticleCardData } from "@/lib/public-content";
import { useBookmarks } from "@/lib/bookmarks";
import { BookmarkIcon, ShareIcon, EyeIcon, ClockIcon, ArrowIcon } from "./icons";

function formatViews(n: number, locale: string) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}${locale === "ar" ? " ألف" : "k"}`;
  return String(n);
}

export default function ArticleCard({ article }: { article: ArticleCardData }) {
  const t = useTranslations("articlesPage");
  const locale = useLocale();
  const { has, toggle } = useBookmarks();
  const bookmarked = has(article.slug);
  const href = `/articles/${article.slug}`;

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/${locale}/articles/${article.slug}`;
    const title = pickLang(locale, article.title_ar, article.title_en);
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
    }
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[24px] border border-line bg-card transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_-24px_rgba(86,40,35,0.5)] focus-within:-translate-y-1">
      <Link href={href} aria-hidden="true" tabIndex={-1} className="relative block aspect-[16/10] overflow-hidden bg-creamy-300">
        {article.cover ? (
          <Image
            src={article.cover.url}
            alt=""
            fill
            sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 92vw"
            className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[34px] text-brown-100">✢</span>
        )}
        {article.category ? (
          <span className="absolute top-3.5 start-3.5 rounded-full bg-creamy-50/95 px-3 py-1 font-sans text-[12px] font-bold text-brown-500 backdrop-blur">
            {pickLang(locale, article.category.name_ar, article.category.name_en)}
          </span>
        ) : null}
      </Link>

      {/* Floating bookmark */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); toggle(article.slug); }}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? t("card.bookmarked") : t("card.bookmark")}
        className={`absolute end-3.5 top-3.5 flex size-9 items-center justify-center rounded-full border backdrop-blur transition-colors ${
          bookmarked
            ? "border-red-500 bg-red-500 text-creamy-50"
            : "border-line bg-creamy-50/90 text-brown-400 hover:text-brown-900"
        }`}
      >
        <BookmarkIcon filled={bookmarked} className="size-[18px]" />
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif text-[19px] font-bold leading-[1.5] text-brown-900 transition-colors group-hover:text-brown-500">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {pickLang(locale, article.title_ar, article.title_en)}
          </Link>
        </h3>
        <p className="line-clamp-2 font-serif text-[14.5px] font-light leading-[1.7] text-brown-400">
          {pickLang(locale, article.excerpt_ar, article.excerpt_en)}
        </p>

        {/* Author + date */}
        <div className="mt-auto flex items-center gap-2.5 pt-1">
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-creamy-400 font-serif text-[13px] font-bold text-brown-500">
            {(article.author_label || "✢").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-sans text-[12.5px] font-bold text-brown-700">{article.author_label || "—"}</p>
            <p className="font-sans text-[11.5px] text-brown-300">{formatDate(locale, article.published_at)}</p>
          </div>
        </div>

        {/* Meta row + actions */}
        <div className="relative z-10 flex items-center justify-between border-t border-line pt-3 font-sans text-[12px] text-brown-300">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex items-center gap-1" dir="ltr">
              <ClockIcon className="size-[15px]" />
              {t("card.minutes", { minutes: article.reading_minutes })}
            </span>
            <span className="inline-flex items-center gap-1" dir="ltr">
              <EyeIcon className="size-[15px]" />
              {formatViews(article.views, locale)}
            </span>
          </div>
          <button
            type="button"
            onClick={share}
            aria-label={t("card.share")}
            className="flex size-8 items-center justify-center rounded-lg text-brown-300 transition-colors hover:bg-creamy-200 hover:text-brown-900"
          >
            <ShareIcon className="size-[16px]" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[24px] border border-line bg-card">
      <div className="aspect-[16/10] animate-pulse bg-creamy-300" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-4 w-4/5 animate-pulse rounded bg-creamy-400" />
        <div className="h-3 w-full animate-pulse rounded bg-creamy-300" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-creamy-300" />
        <div className="mt-2 flex items-center gap-2.5">
          <div className="size-8 animate-pulse rounded-full bg-creamy-400" />
          <div className="h-3 w-24 animate-pulse rounded bg-creamy-300" />
        </div>
      </div>
    </div>
  );
}
