import { setRequestLocale } from "next-intl/server";
import PortalHome from "@/components/auth/PortalHome";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PortalHome />;
}
