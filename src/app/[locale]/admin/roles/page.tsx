import { setRequestLocale } from "next-intl/server";
import RolesScreen from "@/components/admin/RolesScreen";

export default async function AdminRolesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RolesScreen />;
}
