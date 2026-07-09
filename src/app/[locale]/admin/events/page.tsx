import { setRequestLocale } from "next-intl/server";
import EventsScreen from "@/components/admin/EventsScreen";

export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EventsScreen />;
}
