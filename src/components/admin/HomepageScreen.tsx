"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/lib/api";
import {
  galleryApi,
  getHomeSettings,
  partnersApi,
  saveHomeSettings,
  testimonialsApi,
  type HomeSettings,
} from "@/lib/content-api";
import { SpinnerIcon, ChevronDownIcon } from "@/components/auth/icons";
import CollectionManager from "./CollectionManager";
import { MediaPicker } from "./MediaLibrary";
import { ErrorCard } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14px] text-brown-900 focus:border-brown-400 focus:outline-none";

/** field key ending in _en → LTR input */
const HERO_KEYS = [
  "eyebrow_ar", "title_ar", "subtitle_ar", "patron_prefix_ar", "patron_ar",
  "cta_primary_ar", "cta_secondary_ar",
  "eyebrow_en", "title_en", "subtitle_en", "patron_prefix_en", "patron_en",
  "cta_primary_en", "cta_secondary_en",
];
const VISION_TEXT_KEYS = [
  "label_ar", "subtitle_ar", "card_title_ar", "body_ar",
  "label_en", "subtitle_en", "card_title_en", "body_en",
];
const SECTION_KEYS = [
  "programs_label_ar", "programs_subtitle_ar", "programs_label_en", "programs_subtitle_en",
  "theses_label_ar", "theses_subtitle_ar", "theses_label_en", "theses_subtitle_en",
  "features_label_ar", "features_subtitle_ar", "features_label_en", "features_subtitle_en",
  "testimonials_label_ar", "testimonials_subtitle_ar", "testimonials_label_en", "testimonials_subtitle_en",
  "gallery_label_ar", "gallery_subtitle_ar", "gallery_label_en", "gallery_subtitle_en",
  "partners_label_ar", "partners_label_en",
  "apply_label_ar", "apply_subtitle_ar", "apply_intro_ar",
  "apply_label_en", "apply_subtitle_en", "apply_intro_en",
];

const emptyFeature = { title_ar: "", title_en: "", summary_ar: "", summary_en: "", body_ar: "", body_en: "" };

function Accordion({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <section className="rounded-2xl border border-line bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-start"
      >
        <span className="text-[15px] font-bold text-brown-900">{title}</span>
        <ChevronDownIcon className={`size-4 text-brown-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="space-y-3 border-t border-line p-5">{children}</div> : null}
    </section>
  );
}

function TextsEditor() {
  const t = useTranslations("admin.homeEditor");
  const locale = useLocale();
  const toast = useToast();

  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visionPicker, setVisionPicker] = useState<"image_1" | "image_2" | null>(null);

  useEffect(() => {
    getHomeSettings()
      .then((r) => {
        const value = r.homepage ?? {};
        setSettings({
          hero: value.hero ?? {},
          vision: value.vision ?? {},
          sections: value.sections ?? {},
          stats: value.stats ?? [],
          features: value.features ?? [],
        });
      })
      .catch(() => setError(true));
  }, []);

  if (error) return <ErrorCard text={t("errors.load")} onRetry={() => window.location.reload()} retryLabel={t("retry")} />;
  if (!settings) {
    return (
      <div className="flex justify-center py-16">
        <SpinnerIcon className="size-6 text-brown-300" />
      </div>
    );
  }

  function patchGroup(group: "hero" | "vision" | "sections", key: string, value: string) {
    setSettings((s) => (s ? { ...s, [group]: { ...s[group], [key]: value } } : s));
  }

  function renderFields(group: "hero" | "vision" | "sections", keys: string[]) {
    return keys.map((key) => {
      const isTextarea = key.startsWith("body") || key.startsWith("apply_intro") || key.startsWith("subtitle");
      const ltr = key.endsWith("_en");
      const value = (settings?.[group] as Record<string, string>)?.[key] ?? "";
      return (
        <div key={key}>
          <label className="mb-1.5 block text-[13px] font-bold text-brown-500">
            {t(`fields.${key}` as "fields")}
          </label>
          {isTextarea ? (
            <textarea
              dir={ltr ? "ltr" : undefined}
              value={value}
              onChange={(e) => patchGroup(group, key, e.target.value)}
              rows={key.startsWith("body") ? 4 : 2}
              placeholder={t("emptyFallback")}
              className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] placeholder:text-brown-200 focus:border-brown-400 focus:outline-none"
            />
          ) : (
            <input
              dir={ltr ? "ltr" : undefined}
              value={value}
              onChange={(e) => patchGroup(group, key, e.target.value)}
              placeholder={t("emptyFallback")}
              className={`${inputCls} placeholder:text-brown-200`}
            />
          )}
        </div>
      );
    });
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const { homepage } = await saveHomeSettings(settings);
      setSettings({
        hero: homepage.hero ?? {},
        vision: homepage.vision ?? {},
        sections: homepage.sections ?? {},
        stats: homepage.stats ?? [],
        features: homepage.features ?? [],
      });
      toast("success", t("saved"));
    } catch (err) {
      toast("danger", err instanceof ApiError ? err.localized(locale) : t("errors.network"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-[12.5px] text-blue-500">{t("fallbackNote")}</p>

      <Accordion title={t("groups.hero")} defaultOpen>
        {renderFields("hero", HERO_KEYS)}
      </Accordion>

      <Accordion title={t("groups.vision")}>
        {renderFields("vision", VISION_TEXT_KEYS)}
        <div className="grid gap-4 sm:grid-cols-2">
          {(["image_1", "image_2"] as const).map((slot) => {
            const url = (settings.vision as Record<string, string>)?.[slot] ?? "";
            return (
              <div key={slot}>
                <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t(`fields.${slot}` as "fields")}</label>
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="mb-2 h-24 w-full rounded-xl object-cover" />
                ) : null}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setVisionPicker(slot)}
                    className="rounded-xl border-2 border-dashed border-line px-4 py-2 text-[13px] text-brown-400 hover:border-brown-400"
                  >
                    {url ? t("changeImage") : t("pickImage")}
                  </button>
                  {url ? (
                    <button type="button" onClick={() => patchGroup("vision", slot, "")} className="text-[13px] font-bold text-danger hover:underline">
                      {t("removeImage")}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Accordion>

      <Accordion title={t("groups.stats")}>
        {(settings.stats ?? []).map((stat, i) => (
          <div key={i} className="grid grid-cols-[100px_1fr_1fr_auto] items-end gap-2">
            <div>
              <label className="mb-1.5 block text-[12px] font-bold text-brown-500">{t("fields.statValue")}</label>
              <input dir="ltr" type="number" value={stat.value}
                onChange={(e) => setSettings((s) => {
                  if (!s) return s;
                  const stats = [...(s.stats ?? [])];
                  stats[i] = { ...stats[i], value: Number(e.target.value) || 0 };
                  return { ...s, stats };
                })}
                className={inputCls} />
            </div>
            {(["label_ar", "label_en"] as const).map((k) => (
              <div key={k}>
                <label className="mb-1.5 block text-[12px] font-bold text-brown-500">{t(`fields.${k === "label_ar" ? "statLabelAr" : "statLabelEn"}` as "fields")}</label>
                <input dir={k === "label_en" ? "ltr" : undefined} value={stat[k]}
                  onChange={(e) => setSettings((s) => {
                    if (!s) return s;
                    const stats = [...(s.stats ?? [])];
                    stats[i] = { ...stats[i], [k]: e.target.value };
                    return { ...s, stats };
                  })}
                  className={inputCls} />
              </div>
            ))}
            <button type="button" aria-label={t("removeRow")}
              onClick={() => setSettings((s) => s ? { ...s, stats: (s.stats ?? []).filter((_, x) => x !== i) } : s)}
              className="mb-1 flex size-9 items-center justify-center rounded-lg text-danger hover:bg-danger-tint">✕</button>
          </div>
        ))}
        {(settings.stats ?? []).length < 6 ? (
          <button type="button"
            onClick={() => setSettings((s) => s ? { ...s, stats: [...(s.stats ?? []), { value: 0, label_ar: "", label_en: "" }] } : s)}
            className="rounded-xl border-2 border-dashed border-line px-4 py-2 text-[13px] text-brown-400 hover:border-brown-400">
            {t("addStat")}
          </button>
        ) : null}
      </Accordion>

      <Accordion title={t("groups.features")}>
        {(settings.features ?? []).map((feature, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-brown-500">{t("featureN", { n: i + 1 })}</span>
              <button type="button" aria-label={t("removeRow")}
                onClick={() => setSettings((s) => s ? { ...s, features: (s.features ?? []).filter((_, x) => x !== i) } : s)}
                className="text-[13px] font-bold text-danger hover:underline">{t("removeRow")}</button>
            </div>
            {(Object.keys(emptyFeature) as (keyof typeof emptyFeature)[]).map((k) => (
              <div key={k}>
                <label className="mb-1 block text-[12px] font-bold text-brown-500">{t(`fields.feature_${k}` as "fields")}</label>
                {k.startsWith("body") ? (
                  <textarea dir={k.endsWith("_en") ? "ltr" : undefined} value={feature[k]} rows={2}
                    onChange={(e) => setSettings((s) => {
                      if (!s) return s;
                      const features = [...(s.features ?? [])];
                      features[i] = { ...features[i], [k]: e.target.value };
                      return { ...s, features };
                    })}
                    className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2 text-[13.5px] focus:border-brown-400 focus:outline-none" />
                ) : (
                  <input dir={k.endsWith("_en") ? "ltr" : undefined} value={feature[k]}
                    onChange={(e) => setSettings((s) => {
                      if (!s) return s;
                      const features = [...(s.features ?? [])];
                      features[i] = { ...features[i], [k]: e.target.value };
                      return { ...s, features };
                    })}
                    className={inputCls} />
                )}
              </div>
            ))}
          </div>
        ))}
        {(settings.features ?? []).length < 6 ? (
          <button type="button"
            onClick={() => setSettings((s) => s ? { ...s, features: [...(s.features ?? []), { ...emptyFeature }] } : s)}
            className="rounded-xl border-2 border-dashed border-line px-4 py-2 text-[13px] text-brown-400 hover:border-brown-400">
            {t("addFeature")}
          </button>
        ) : null}
      </Accordion>

      <Accordion title={t("groups.sections")}>
        {renderFields("sections", SECTION_KEYS)}
      </Accordion>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full bg-brown-500 px-6 py-2.5 text-[14px] font-bold text-creamy-100 hover:bg-brown-600 disabled:opacity-50"
      >
        {saving ? <SpinnerIcon className="size-4" /> : null}
        {t("saveCta")}
      </button>

      {visionPicker ? (
        <MediaPicker
          onClose={() => setVisionPicker(null)}
          onPick={(asset) => {
            patchGroup("vision", visionPicker, asset.url);
            setVisionPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** الصفحة الرئيسية — tabbed manager: texts / testimonials / partners / gallery. */
export default function HomepageScreen() {
  const t = useTranslations("admin.homeEditor");
  const [tab, setTab] = useState<"texts" | "testimonials" | "partners" | "gallery">("texts");

  const TABS = ["texts", "testimonials", "partners", "gallery"] as const;

  return (
    <div className="mx-auto max-w-[880px]">
      <h1 className="mb-1 font-display text-[24px] font-bold text-brown-900">{t("title")}</h1>
      <p className="mb-5 text-[13px] text-brown-300">{t("hint")}</p>

      <div role="tablist" className="mb-6 flex flex-wrap gap-1 rounded-xl bg-creamy-200 p-1" style={{ width: "fit-content" }}>
        {TABS.map((key) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-[13px] font-bold transition-colors ${
              tab === key ? "bg-card text-brown-900 shadow-sm" : "text-brown-400"
            }`}>
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === "texts" ? <TextsEditor /> : null}
      {tab === "testimonials" ? (
        <CollectionManager
          ns="admin.testimonials"
          api={testimonialsApi}
          embedded
          fields={[
            { key: "name_ar", labelKey: "nameAr", type: "text", required: true },
            { key: "role_ar", labelKey: "roleAr", type: "text" },
            { key: "quote_ar", labelKey: "quoteAr", type: "textarea", required: true },
            { key: "name_en", labelKey: "nameEn", type: "ltr" },
            { key: "role_en", labelKey: "roleEn", type: "ltr" },
            { key: "quote_en", labelKey: "quoteEn", type: "textarea" },
          ]}
          itemTitle={(x) => x.name_ar}
          itemSubtitle={(x) => x.quote_ar.slice(0, 80)}
        />
      ) : null}
      {tab === "partners" ? (
        <CollectionManager
          ns="admin.partners"
          api={partnersApi}
          embedded
          fields={[
            { key: "name_ar", labelKey: "nameAr", type: "text", required: true },
            { key: "name_en", labelKey: "nameEn", type: "ltr" },
            { key: "logo_id", labelKey: "logo", type: "media" },
            { key: "url", labelKey: "url", type: "ltr" },
          ]}
          itemTitle={(x) => x.name_ar}
          itemImage={(x) => x.logo?.url}
        />
      ) : null}
      {tab === "gallery" ? (
        <CollectionManager
          ns="admin.galleryManager"
          api={galleryApi}
          embedded
          fields={[
            { key: "media_id", labelKey: "image", type: "media", required: true },
            { key: "caption_ar", labelKey: "captionAr", type: "text" },
            { key: "caption_en", labelKey: "captionEn", type: "ltr" },
          ]}
          itemTitle={(x) => x.caption_ar || x.media.original_name}
          itemImage={(x) => x.media.url}
        />
      ) : null}
    </div>
  );
}
