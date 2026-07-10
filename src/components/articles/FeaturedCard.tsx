"use client";

import { useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import { pickLang, formatDate, type ArticleCard as ArticleData } from "@/lib/public-content";
import { ShareIcon, ClockIcon, ArrowIcon } from "./icons";

gsap.registerPlugin(useGSAP);

/** Lead editorial card — large, image-forward. `wide` spans two grid columns. */
export default function FeaturedCard({ article, wide }: { article: ArticleData; wide?: boolean }) {
  const t = useTranslations("articlesPage");
  const locale = useLocale();
  const href = `/articles/${article.slug}`;
  const cardRef = useRef<HTMLElement>(null);

  // Simple, smooth hover: a subtle cover zoom + slight brighten, driven by GSAP.
  useGSAP(
    (_ctx, contextSafe) => {
      const card = cardRef.current;
      if (!card || !contextSafe) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const media = card.querySelector<HTMLElement>("[data-featured-media]");
      if (!media) return;
      const enter = contextSafe(() => gsap.to(media, { scale: 1.05, opacity: 0.72, duration: 0.6, ease: "power2.out" }));
      const leave = contextSafe(() => gsap.to(media, { scale: 1, opacity: 0.62, duration: 0.6, ease: "power2.out" }));

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
    if (navigator.share) navigator.share({ title: pickLang(locale, article.title_ar, article.title_en), url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }

  return (
    <article
      ref={cardRef}
      className={`group relative flex min-h-[320px] overflow-hidden rounded-[28px] border border-line bg-brown-900 text-creamy-100 ${
        wide ? "md:min-h-[420px]" : ""
      }`}
    >
      {/* Full-bleed cover — decorative; the title link below is the accessible target */}
      <Link href={href} aria-hidden="true" tabIndex={-1} className="absolute inset-0">
        {article.cover ? (
          <Image
            data-featured-media
            src={article.cover.url}
            alt=""
            fill
            sizes={wide ? "(min-width:1024px) 760px, 100vw" : "(min-width:1024px) 380px, 100vw"}
            className="object-cover opacity-[0.62] will-change-transform"
            priority
          />
        ) : (
          <div aria-hidden className="relative flex h-full items-center justify-center bg-gradient-to-br from-brown-700 to-brown-900">
            <span className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "url(/Pattern.svg)", backgroundSize: "220px" }} />
            <span className="relative text-[46px] text-creamy-100/25">✢</span>
          </div>
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
