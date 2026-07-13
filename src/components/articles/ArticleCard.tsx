"use client";

import { useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import { pickLang, formatDate, type ArticleCard as ArticleCardData } from "@/lib/public-content";
import { ShareIcon, EyeIcon, ClockIcon } from "./icons";

gsap.registerPlugin(useGSAP);

function formatViews(n: number, locale: string) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}${locale === "ar" ? " ألف" : "k"}`;
  return String(n);
}

export default function ArticleCard({ article }: { article: ArticleCardData }) {
  const t = useTranslations("articlesPage");
  const locale = useLocale();
  const href = `/articles/${article.slug}`;
  const cardRef = useRef<HTMLElement>(null);

  // Simple, smooth hover: a gentle lift + subtle image zoom, driven by GSAP.
  useGSAP(
    (_ctx, contextSafe) => {
      const card = cardRef.current;
      if (!card || !contextSafe) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const media = card.querySelector<HTMLElement>("[data-card-media]");
      const enter = contextSafe(() => {
        gsap.to(card, { y: -6, duration: 0.4, ease: "power2.out" });
        if (media) gsap.to(media, { scale: 1.05, duration: 0.5, ease: "power2.out" });
      });
      const leave = contextSafe(() => {
        gsap.to(card, { y: 0, duration: 0.4, ease: "power2.out" });
        if (media) gsap.to(media, { scale: 1, duration: 0.5, ease: "power2.out" });
      });

      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointerleave", leave);
      card.addEventListener("focusin", enter);
      card.addEventListener("focusout", leave);
      return () => {
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointerleave", leave);
        card.removeEventListener("focusin", enter);
        card.removeEventListener("focusout", leave);
      };
    },
    { scope: cardRef },
  );

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
    <article ref={cardRef} className="group relative flex flex-col overflow-hidden rounded-[24px] border border-line bg-card transition-colors duration-300 will-change-transform hover:bg-white">
      <Link href={href} aria-hidden="true" tabIndex={-1} className="relative block aspect-[16/10] overflow-hidden bg-creamy-300">
        {article.cover ? (
          <Image
            data-card-media
            src={article.cover.url}
            alt=""
            fill
            sizes="(min-width:1024px) 360px, (min-width:640px) 45vw, 92vw"
            className="object-cover will-change-transform"
          />
        ) : (
          <div aria-hidden className="relative flex h-full items-center justify-center bg-gradient-to-br from-creamy-200 to-creamy-400">
            <span className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "url(/Pattern.svg)", backgroundSize: "180px" }} />
            <span data-card-media className="relative text-[42px] text-brown-300/70 will-change-transform">✢</span>
          </div>
        )}
        {article.category ? (
          <span className="absolute top-3.5 start-3.5 rounded-full bg-creamy-50/95 px-3 py-1 font-sans text-[12px] font-bold text-brown-500 backdrop-blur">
            {pickLang(locale, article.category.name_ar, article.category.name_en)}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="min-h-[3em] font-serif text-[19px] font-bold leading-[1.5] text-brown-900 transition-colors group-hover:text-brown-500">
          <Link href={href} className="line-clamp-2 after:absolute after:inset-0 after:content-['']">
            {pickLang(locale, article.title_ar, article.title_en)}
          </Link>
        </h3>
        <p className="line-clamp-2 min-h-[3.4em] font-serif text-[14.5px] font-light leading-[1.7] text-brown-400">
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
