import { setRequestLocale } from "next-intl/server";
import UsersScreen from "@/components/admin/UsersScreen";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <UsersScreen />;
}
