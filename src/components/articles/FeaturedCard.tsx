"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickLang, formatDate, type ArticleCard as ArticleData } from "@/lib/public-content";
import { useBookmarks } from "@/lib/bookmarks";
import { BookmarkIcon, ShareIcon, ClockIcon, ArrowIcon } from "./icons";

/** Lead editorial card — large, image-forward. `wide` spans two grid columns. */
export default function FeaturedCard({ article, wide }: { article: ArticleData; wide?: boolean }) {
  const t = useTranslations("articlesPage");
  const locale = useLocale();
  const { has, toggle } = useBookmarks();
  const bookmarked = has(article.slug);
  const href = `/articles/${article.slug}`;

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/${locale}/articles/${article.slug}`;
    if (navigator.share) navigator.share({ title: pickLang(locale, article.title_ar, article.title_en), url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }

  return (
    <article
      className={`group relative flex min-h-[320px] overflow-hidden rounded-[28px] border border-line bg-brown-900 text-creamy-100 transition-shadow duration-300 hover:shadow-[0_24px_60px_-28px_rgba(36,17,15,0.7)] ${
        wide ? "md:min-h-[420px]" : ""
      }`}
    >
      {/* Full-bleed cover — decorative; the title link below is the accessible target */}
      <Link href={href} aria-hidden="true" tabIndex={-1} className="absolute inset-0">
        {article.cover ? (
          <Image
            src={article.cover.url}
            alt=""
            fill
            sizes={wide ? "(min-width:1024px) 760px, 100vw" : "(min-width:1024px) 380px, 100vw"}
            className="object-cover opacity-[0.62] transition-[transform,opacity] duration-[700ms] ease-out group-hover:scale-[1.04] group-hover:opacity-70 motion-reduce:group-hover:scale-100"
            priority
          />
        ) : (
          <span className="flex h-full items-center justify-center bg-brown-600 text-[44px] text-creamy-100/30">✢</span>
        )}
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(36,17,15,0.95),rgba(36,17,15,0.55)_45%,rgba(36,17,15,0.15)_78%)]" />
      </Link>

      {/* Top row: featured badge + actions */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 font-sans text-[12px] font-bold text-creamy-50">
          ✦ {t("featured.badge")}
        </span>
        <span className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); toggle(article.slug); }}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? t("card.bookmarked") : t("card.bookmark")}
            className={`flex size-9 items-center justify-center rounded-full border backdrop-blur transition-colors ${
              bookmarked ? "border-red-500 bg-red-500 text-creamy-50" : "border-creamy-100/30 bg-brown-900/40 text-creamy-100 hover:bg-brown-900/70"
            }`}
          >
            <BookmarkIcon filled={bookmarked} className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={share}
            aria-label={t("card.share")}
            className="flex size-9 items-center justify-center rounded-full border border-creamy-100/30 bg-brown-900/40 text-creamy-100 backdrop-blur transition-colors hover:bg-brown-900/70"
          >
            <ShareIcon className="size-[16px]" />
          </button>
        </span>
      </div>

      {/* Bottom content */}
      <div className="relative z-10 mt-auto flex flex-col gap-3 p-6 md:p-8">
        {article.category ? (
          <span className="w-fit rounded-full bg-creamy-100/15 px-3 py-1 font-sans text-[12px] font-bold text-creamy-100 backdrop-blur">
            {pickLang(locale, article.category.name_ar, article.category.name_en)}
          </span>
        ) : null}
        <h3 className={`font-serif font-bold leading-[1.4] ${wide ? "text-[26px] md:text-[34px]" : "text-[22px]"}`}>
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {pickLang(locale, article.title_ar, article.title_en)}
          </Link>
        </h3>
        {wide ? (
          <p className="line-clamp-2 max-w-[560px] font-serif text-[15.5px] font-light leading-[1.75] text-creamy-100/80">
            {pickLang(locale, article.excerpt_ar, article.excerpt_en)}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-[12.5px] text-creamy-100/70">
          <span className="font-bold text-creamy-100">{article.author_label || "—"}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(locale, article.published_at)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1" dir="ltr">
            <ClockIcon className="size-[14px]" /> {t("card.minutes", { minutes: article.reading_minutes })}
          </span>
        </div>
        <span className="relative z-10 mt-2 inline-flex w-fit items-center gap-2 font-sans text-[13.5px] font-bold text-creamy-50">
          {t("featured.cta")}
          <ArrowIcon className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:rtl:-translate-x-1" />
        </span>
      </div>
    </article>
  );
}
