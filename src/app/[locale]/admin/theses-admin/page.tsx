import { setRequestLocale } from "next-intl/server";
import ThesesScreen from "@/components/admin/ThesesScreen";

export default async function AdminThesesScreenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ThesesScreen />;
}
