import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThesesExplorer, { type ThesisItem } from "@/components/theses/ThesesExplorer";
import { ChevronRight } from "@/components/articles/icons";
import { getHomeData, pickLang } from "@/lib/public-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "theses" });
  return { title: t("heroTitle"), description: t("heroSubtitle") };
}

type RawFallback = { title: string; researcher: string; degree: string; institution: string; year: string };

function normalizeDegree(value: string): "masters" | "doctorate" {
  return /doctor|phd|دكتور/i.test(value) ? "doctorate" : "masters";
}

export default async function ThesesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("theses");

  // Real CMS content; fall back to the designed placeholder set while the library is empty.
  const home = await getHomeData();
  let items: ThesisItem[] = home.theses.map((x, i) => ({
    id: String(i),
    title: pickLang(locale, x.title_ar, x.title_en),
    researcher: pickLang(locale, x.researcher_ar, x.researcher_en),
    institution: pickLang(locale, x.institution_ar, x.institution_en),
    degree: normalizeDegree(x.degree),
    year: x.year,
  }));

  if (items.length === 0) {
    const fallback = t.raw("items") as RawFallback[];
    items = fallback.map((x, i) => ({
      id: String(i),
      title: x.title,
      researcher: x.researcher,
      institution: x.institution,
      degree: normalizeDegree(x.degree),
      year: Number(x.year),
    }));
  }

  return (
    <>
      <Header />
      <main>
        {/* Breadcrumb */}
        <nav aria-label={t("breadcrumb")} className="mx-auto max-w-[1280px] px-4 pt-6 md:px-8">
          <ol className="flex items-center gap-1.5 font-sans text-[13px] text-brown-300">
            <li><Link href="/" className="transition-colors hover:text-brown-500">{t("breadcrumbHome")}</Link></li>
            <li aria-hidden><ChevronRight className="size-3.5 rtl:rotate-180" /></li>
            <li className="font-bold text-brown-500" aria-current="page">{t("breadcrumb")}</li>
          </ol>
        </nav>

        <ThesesExplorer items={items} />
      </main>
      <Footer />
    </>
  );
}
