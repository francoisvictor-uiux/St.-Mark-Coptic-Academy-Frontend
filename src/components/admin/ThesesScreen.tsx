"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import CollectionManager, { type FieldDef } from "./CollectionManager";
import { thesesApi, listCategories, type Category } from "@/lib/content-api";

export default function ThesesScreen() {
  const t = useTranslations("admin.thesesAdmin");
  const locale = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories()
      .then((r) => setCategories(r.categories.filter((c) => c.is_active)))
      .catch(() => {});
  }, []);

  const categoryOptions = [
    { value: "", label: t("noCategory") },
    ...categories.map((c) => ({
      value: c.id,
      label: locale === "en" && c.name_en ? c.name_en : c.name_ar,
    })),
  ];

  const fields: FieldDef[] = [
    { key: "title_ar", labelKey: "titleAr", type: "text", required: true },
    { key: "researcher_ar", labelKey: "researcherAr", type: "text", required: true },
    {
      key: "degree", labelKey: "degree", type: "select",
      options: [
        { value: "masters", labelKey: "masters" },
        { value: "doctorate", labelKey: "doctorate" },
      ],
    },
    {
      key: "category_id", labelKey: "category", type: "select",
      nullable: true, searchable: true, options: categoryOptions,
    },
    { key: "institution_ar", labelKey: "institutionAr", type: "text" },
    { key: "year", labelKey: "year", type: "number", required: true },
    { key: "abstract_ar", labelKey: "abstractAr", type: "textarea" },
    { key: "keywords", labelKey: "keywords", type: "tags" },
    { key: "file_url", labelKey: "fileUrl", type: "ltr" },
    { key: "title_en", labelKey: "titleEn", type: "ltr" },
    { key: "researcher_en", labelKey: "researcherEn", type: "ltr" },
    { key: "institution_en", labelKey: "institutionEn", type: "ltr" },
  ];

  return (
    <CollectionManager
      ns="admin.thesesAdmin"
      api={thesesApi}
      fields={fields}
      itemTitle={(x) => x.title_ar}
      itemSubtitle={(x) => `${x.researcher_ar} · ${t(`options.${x.degree}` as "options.masters")} · ${x.year}`}
    />
  );
}
