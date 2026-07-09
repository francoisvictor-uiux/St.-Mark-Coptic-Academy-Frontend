import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { formatDate, getArticleBySlug, pickLang } from "@/lib/public-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return {
    title: pickLang(locale, article.title_ar, article.title_en),
    description: pickLang(locale, article.excerpt_ar, article.excerpt_en),
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articles");
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const body = locale === "en" && article.body_en ? article.body_en : article.body_ar;
  const bodyDir = locale === "en" && article.body_en ? "ltr" : "rtl";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[820px] px-4 py-24 md:px-8 md:py-32">
        <Link href="/articles" className="font-serif text-[15px] font-bold text-blue-500 underline-offset-4 hover:underline">
          ← {t("label")}
        </Link>

        <header className="mt-6">
          {article.category ? (
            <span className="w-fit rounded-full bg-brown-500/10 px-3.5 py-1 font-serif text-[13px] font-bold text-brown-500">
              {pickLang(locale, article.category.name_ar, article.category.name_en)}
            </span>
          ) : null}
          <h1 className="mt-4 font-display text-[32px] font-bold leading-[1.5] text-brown-900 md:text-[40px]">
            {pickLang(locale, article.title_ar, article.title_en)}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-serif text-[15px] text-brown-300">
            {article.author_label ? (
              <>
                <span className="font-bold text-brown-500">{article.author_label}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>{formatDate(locale, article.published_at)}</span>
            <span aria-hidden="true">·</span>
            <span>{t("readingTime", { minutes: article.reading_minutes })}</span>
          </p>
        </header>

        {article.cover ? (
          <div className="relative mt-8 h-64 overflow-hidden rounded-card md:h-96">
            <Image
              src={article.cover.url}
              alt={pickLang(locale, article.cover.alt_ar, article.cover.alt_en)}
              fill
              sizes="(min-width: 820px) 820px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <div
          dir={bodyDir}
          className="article-body mt-10 font-serif text-[17px] leading-[1.95] text-brown-900"
          // Server-sanitized (nh3 whitelist) before storage — safe to render.
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </main>
      <Footer />
    </>
  );
}
