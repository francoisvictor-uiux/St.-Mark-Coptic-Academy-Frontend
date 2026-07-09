import { setRequestLocale } from "next-intl/server";
import RoleMatrixScreen from "@/components/admin/RoleMatrixScreen";

export default async function AdminRoleMatrixPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <RoleMatrixScreen roleId={id} />;
}
