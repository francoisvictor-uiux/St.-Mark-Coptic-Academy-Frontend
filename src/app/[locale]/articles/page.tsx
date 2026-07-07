import { setRequestLocale, getTranslations } from "next-intl/server";
import ComingSoon from "@/components/ui/ComingSoon";

export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("articles");
  return <ComingSoon title={t("label")} />;
}
