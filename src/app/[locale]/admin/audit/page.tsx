import { setRequestLocale } from "next-intl/server";
import AuditScreen from "@/components/admin/AuditScreen";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuditScreen />;
}
