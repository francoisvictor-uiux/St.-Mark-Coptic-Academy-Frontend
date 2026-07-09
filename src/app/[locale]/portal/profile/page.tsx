import { setRequestLocale } from "next-intl/server";
import ProfileScreen from "@/components/portal/ProfileScreen";

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileScreen />;
}
