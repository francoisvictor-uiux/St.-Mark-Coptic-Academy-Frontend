import { setRequestLocale } from "next-intl/server";
import ProgramsScreen from "@/components/admin/ProgramsScreen";

export default async function AdminProgramsScreenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProgramsScreen />;
}
