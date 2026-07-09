import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { formatDate, getNewsBySlug, pickLang } from "@/lib/public-content";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("news");
  const item = await getNewsBySlug(slug);
  if (!item) notFound();

  const body = locale === "en" && item.body_en ? item.body_en : item.body_ar;
  const bodyDir = locale === "en" && item.body_en ? "ltr" : "rtl";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[820px] px-4 py-24 md:px-8 md:py-32">
        <Link href="/news" className="font-serif text-[15px] font-bold text-blue-500 underline-offset-4 hover:underline">
          ← {t("label")}
        </Link>
        <h1 className="mt-6 font-display text-[32px] font-bold leading-[1.5] text-brown-900 md:text-[40px]">
          {pickLang(locale, item.title_ar, item.title_en)}
        </h1>
        <p className="mt-3 font-serif text-[15px] text-brown-300">{formatDate(locale, item.published_at)}</p>
        {item.cover ? (
          <div className="relative mt-8 h-64 overflow-hidden rounded-card md:h-96">
            <Image src={item.cover.url} alt={pickLang(locale, item.cover.alt_ar, item.cover.alt_en)} fill sizes="(min-width: 820px) 820px, 100vw" className="object-cover" priority />
          </div>
        ) : null}
        <div
          dir={bodyDir}
          className="article-body mt-10 font-serif text-[17px] leading-[1.95] text-brown-900"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </main>
      <Footer />
    </>
  );
}
