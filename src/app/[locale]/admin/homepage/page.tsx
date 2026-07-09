import { setRequestLocale } from "next-intl/server";
import HomepageScreen from "@/components/admin/HomepageScreen";

export default async function AdminHomepageScreenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomepageScreen />;
}
