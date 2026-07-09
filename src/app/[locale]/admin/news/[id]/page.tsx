import { setRequestLocale } from "next-intl/server";
import NewsEditorScreen from "@/components/admin/NewsEditorScreen";

export default async function AdminNewsEditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <NewsEditorScreen newsId={id} />;
}
