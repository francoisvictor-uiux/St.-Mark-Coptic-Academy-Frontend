import { setRequestLocale, getTranslations } from "next-intl/server";
import ComingSoon from "@/components/ui/ComingSoon";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("footer");
  return <ComingSoon title={t("terms")} />;
}
