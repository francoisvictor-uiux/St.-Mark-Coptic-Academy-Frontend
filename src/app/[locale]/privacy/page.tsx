import { setRequestLocale, getTranslations } from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ComingSoon from "@/components/ui/ComingSoon";
import { getPageBySlug, pickLang } from "@/lib/public-content";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("footer");
  // CMS-managed when a published page with slug "privacy" exists.
  const page = await getPageBySlug("privacy");
  if (!page) return <ComingSoon title={t("privacy")} />;

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
