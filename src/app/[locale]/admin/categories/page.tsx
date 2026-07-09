import { setRequestLocale } from "next-intl/server";
import CategoriesScreen from "@/components/admin/CategoriesScreen";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CategoriesScreen />;
}
