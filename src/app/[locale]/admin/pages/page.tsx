import { setRequestLocale } from "next-intl/server";
import PagesScreen from "@/components/admin/PagesScreen";

export default async function AdminPagesScreenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PagesScreen />;
}
