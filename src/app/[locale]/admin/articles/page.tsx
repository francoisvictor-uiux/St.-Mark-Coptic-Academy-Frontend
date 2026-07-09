import { setRequestLocale } from "next-intl/server";
import ArticlesScreen from "@/components/admin/ArticlesScreen";

export default async function AdminArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ArticlesScreen />;
}
