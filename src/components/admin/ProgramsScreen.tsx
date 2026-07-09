"use client";

import CollectionManager from "./CollectionManager";
import { programsApi } from "@/lib/content-api";
import { useTranslations } from "next-intl";

export default function ProgramsScreen() {
  const t = useTranslations("admin.programsAdmin");
  return (
    <CollectionManager
      ns="admin.programsAdmin"
      api={programsApi}
      fields={[
        { key: "name_ar", labelKey: "nameAr", type: "text", required: true },
        { key: "name_en", labelKey: "nameEn", type: "ltr", required: true },
        { key: "description_ar", labelKey: "descriptionAr", type: "textarea" },
        { key: "description_en", labelKey: "descriptionEn", type: "textarea" },
        { key: "duration_ar", labelKey: "durationAr", type: "text" },
        { key: "duration_en", labelKey: "durationEn", type: "ltr" },
        {
          key: "enrollment_status", labelKey: "status", type: "select",
          options: [
            { value: "open", labelKey: "open" },
            { value: "soon", labelKey: "soon" },
            { value: "closed", labelKey: "closed" },
          ],
        },
        { key: "cover_id", labelKey: "cover", type: "media" },
      ]}
      itemTitle={(x) => x.name_ar}
      itemSubtitle={(x) => `${t(`options.${x.enrollment_status}` as "options.open")}${x.duration_ar ? ` · ${x.duration_ar}` : ""}`}
      itemImage={(x) => x.cover?.url}
    />
  );
}
