import { setRequestLocale } from "next-intl/server";
import NewsScreen from "@/components/admin/NewsScreen";

export default async function AdminNewsScreenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NewsScreen />;
}
