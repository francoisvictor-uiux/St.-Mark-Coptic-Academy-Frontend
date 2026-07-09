"use client";

import CollectionManager from "./CollectionManager";
import { thesesApi } from "@/lib/content-api";
import { useTranslations } from "next-intl";

export default function ThesesScreen() {
  const t = useTranslations("admin.thesesAdmin");
  return (
    <CollectionManager
      ns="admin.thesesAdmin"
      api={thesesApi}
      fields={[
        { key: "title_ar", labelKey: "titleAr", type: "text", required: true },
        { key: "researcher_ar", labelKey: "researcherAr", type: "text", required: true },
        {
          key: "degree", labelKey: "degree", type: "select",
          options: [
            { value: "masters", labelKey: "masters" },
            { value: "doctorate", labelKey: "doctorate" },
          ],
        },
        { key: "institution_ar", labelKey: "institutionAr", type: "text" },
        { key: "year", labelKey: "year", type: "number", required: true },
        { key: "title_en", labelKey: "titleEn", type: "ltr" },
        { key: "researcher_en", labelKey: "researcherEn", type: "ltr" },
        { key: "institution_en", labelKey: "institutionEn", type: "ltr" },
      ]}
      itemTitle={(x) => x.title_ar}
      itemSubtitle={(x) => `${x.researcher_ar} · ${t(`options.${x.degree}` as "options.masters")} · ${x.year}`}
    />
  );
}
