import { setRequestLocale, getTranslations } from "next-intl/server";
import MediaLibrary from "@/components/admin/MediaLibrary";

export default async function AdminMediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.media");
  return (
    <div>
      <h1 className="mb-5 font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
      <MediaLibrary />
    </div>
  );
}
