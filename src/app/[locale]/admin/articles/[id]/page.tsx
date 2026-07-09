import { setRequestLocale } from "next-intl/server";
import ArticleEditorScreen from "@/components/admin/ArticleEditorScreen";

export default async function AdminArticleEditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ArticleEditorScreen articleId={id} />;
}
