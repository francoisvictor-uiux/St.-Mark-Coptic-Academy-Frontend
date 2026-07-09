import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ArticlesExplorer from "@/components/articles/ArticlesExplorer";
import { ChevronRight } from "@/components/articles/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "articlesPage" });
  return { title: t("hero.title"), description: t("hero.subtitle") };
}

export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articlesPage");

  return (
    <>
      <Header />
      <main>
        {/* Breadcrumb */}
        <nav aria-label={t("breadcrumb.label")} className="mx-auto max-w-[1280px] px-4 pt-6 md:px-8">
          <ol className="flex items-center gap-1.5 font-sans text-[13px] text-brown-300">
            <li><Link href="/" className="transition-colors hover:text-brown-500">{t("breadcrumb.home")}</Link></li>
            <li aria-hidden><ChevronRight className="size-3.5 rtl:rotate-180" /></li>
            <li className="font-bold text-brown-500" aria-current="page">{t("breadcrumb.articles")}</li>
          </ol>
        </nav>

        <ArticlesExplorer />
      </main>
      <Footer />
    </>
  );
}
