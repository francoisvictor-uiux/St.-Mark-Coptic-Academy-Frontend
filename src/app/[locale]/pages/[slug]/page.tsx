import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getPageBySlug, pickLang } from "@/lib/public-content";

export default async function CmsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const body = locale === "en" && page.body_en ? page.body_en : page.body_ar;
  const bodyDir = locale === "en" && page.body_en ? "ltr" : "rtl";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[820px] px-4 py-24 md:px-8 md:py-32">
        <h1 className="font-display text-[32px] font-bold leading-[1.5] text-brown-900 md:text-[40px]">
          {pickLang(locale, page.title_ar, page.title_en)}
        </h1>
        <div
          dir={bodyDir}
          className="article-body mt-8 font-serif text-[17px] leading-[1.95] text-brown-900"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </main>
      <Footer />
    </>
  );
}
