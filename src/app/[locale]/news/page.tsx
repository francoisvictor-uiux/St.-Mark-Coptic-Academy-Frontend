import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatDate, getPublishedNews, pickLang } from "@/lib/public-content";

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("news");
  const items = await getPublishedNews();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 py-24 md:px-8 md:py-32">
        <SectionHeader label={t("label")} subtitle={t("subtitle")} />
        {items.length === 0 ? (
          <p className="mt-16 text-center font-serif text-lg font-light text-brown-400">{t("emptyState")}</p>
        ) : (
          <div className="mt-14 flex flex-col gap-8">
            {items.map((item) => (
              <article key={item.id} className="group flex flex-col gap-5 border-b border-line pb-8 md:flex-row md:items-center md:gap-8">
                <Link href={`/news/${item.slug}`} className="relative block h-44 shrink-0 overflow-hidden rounded-card bg-creamy-300 md:w-64">
                  {item.cover ? (
                    <Image src={item.cover.url} alt={pickLang(locale, item.cover.alt_ar, item.cover.alt_en)} fill sizes="256px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[32px] text-brown-100">✢</span>
                  )}
                </Link>
                <div className="flex flex-col gap-2">
                  <p className="font-serif text-sm text-brown-300">{formatDate(locale, item.published_at)}</p>
                  <h2 className="font-serif text-xl font-bold leading-[1.5] text-brown-900 transition-colors group-hover:text-brown-500">
                    <Link href={`/news/${item.slug}`}>{pickLang(locale, item.title_ar, item.title_en)}</Link>
                  </h2>
                  <p className="font-serif text-[15px] font-light leading-[1.7] text-brown-400">
                    {pickLang(locale, item.excerpt_ar, item.excerpt_en)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
