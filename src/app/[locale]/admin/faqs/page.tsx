import { setRequestLocale } from "next-intl/server";
import FaqsScreen from "@/components/admin/FaqsScreen";

export default async function AdminFaqsScreenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FaqsScreen />;
}
