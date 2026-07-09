import { setRequestLocale } from "next-intl/server";
import UserDetailScreen from "@/components/admin/UserDetailScreen";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <UserDetailScreen userId={id} />;
}
