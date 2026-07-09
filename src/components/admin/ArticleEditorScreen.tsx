"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin-api";
import {
  createArticle,
  deleteArticle,
  getArticle,
  listCategories,
  setArticleStatus,
  updateArticle,
  type ArticleDetail,
  type Category,
  type MediaAsset,
} from "@/lib/content-api";
import SearchableSelect from "@/components/auth/SearchableSelect";
import { SpinnerIcon } from "@/components/auth/icons";
import RichTextEditor from "./RichTextEditor";
import { MediaPicker } from "./MediaLibrary";
import { ContentStatusBadge } from "./ArticlesScreen";
import { ErrorCard, Modal, ModalActions } from "./ui";
import { useToast } from "./AdminShell";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-creamy-50 px-4 text-[14.5px] text-brown-900 focus:border-brown-400 focus:outline-none";

type Draft = {
  title_ar: string;
  title_en: string;
  slug: string;
  excerpt_ar: string;
  excerpt_en: string;
  body_ar: string;
  body_en: string;
  category_id: string | null;
  cover: MediaAsset | null;
  is_featured: boolean;
  tags: string[];
};

const empty: Draft = {
  title_ar: "", title_en: "", slug: "", excerpt_ar: "", excerpt_en: "",
  body_ar: "", body_en: "", category_id: null, cover: null,
  is_featured: false, tags: [],
};

/** Article editor — create ("new") and edit modes. */
export default function ArticleEditorScreen({ articleId }: { articleId: string }) {
  const t = useTranslations("admin.articleEditor");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const { user: me } = useAuth();
  const isNew = articleId === "new";

  const [draft, setDraft] = useState<Draft>(empty);
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">(isNew ? "ready" : "loading");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (isNew) return;
    setState("loading");
    try {
      const data = await getArticle(articleId);
      setArticle(data);
      setDraft({
        title_ar: data.title_ar, title_en: data.title_en, slug: data.slug,
        excerpt_ar: data.excerpt_ar, excerpt_en: data.excerpt_en,
        body_ar: data.body_ar, body_en: data.body_en,
        category_id: data.category?.id ?? null, cover: data.cover,
        is_featured: data.is_featured, tags: data.tags ?? [],
      });
      setState("ready");
    } catch {
      setState("error");
    }
  }, [articleId, isNew]);

  useEffect(() => {
    load();
    listCategories().then((r) => setCategories(r.categories)).catch(() => {});
  }, [load]);

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
    setDirty(true);
  }

  async function save(): Promise<ArticleDetail | null> {
    if (!draft.title_ar.trim()) {
      toast("danger", t("titleRequired"));
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        title_ar: draft.title_ar.trim(),
        title_en: draft.title_en.trim(),
        slug: draft.slug.trim(),
        excerpt_ar: draft.excerpt_ar.trim(),
        excerpt_en: draft.excerpt_en.trim(),
        body_ar: draft.body_ar,
        body_en: draft.body_en,
        category_id: draft.category_id,
        cover_id: draft.cover?.id ?? null,
        is_featured: draft.is_featured,
        tags: draft.tags,
      };
      const saved = isNew ? await createArticle(payload) : await updateArticle(articleId, payload);
      setArticle(saved);
      setDirty(false);
      toast("success", t("saved"));
      if (isNew) router.replace(`/admin/articles/${saved.id}`);
      return saved;
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!article) return;
    setPublishing(true);
    try {
      // Unsaved edits ride along with the publish click.
      if (dirty) {
        const saved = await save();
        if (!saved) return;
      }
      const action = article.status === "published" ? "unpublish" : "publish";
      const updated = await setArticleStatus(article.id, action);
      setArticle(updated);
      toast("success", action === "publish" ? t("published") : t("unpublished"));
    } catch (error) {
      toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    } finally {
      setPublishing(false);
    }
  }

  if (state === "error") return <ErrorCard text={t("errors.load")} onRetry={load} retryLabel={t("retry")} />;
  if (state === "loading") {
    return (
      <div className="flex justify-center py-24">
        <SpinnerIcon className="size-6 text-brown-300" />
      </div>
    );
  }

  const canPublish = can(me, "articles.publish");

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/articles" className="text-[13px] font-bold text-blue-500 hover:underline">
            ← {t("back")}
          </Link>
          {article ? <ContentStatusBadge status={article.status} /> : null}
          {dirty ? <span className="text-[12px] text-warning">{t("unsaved")}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {article?.status === "published" ? (
            <Link
              href={`/articles/${article.slug}`}
              target="_blank"
              className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-brown-500 hover:border-brown-400"
            >
              {t("viewOnSite")}
            </Link>
          ) : null}
          {!isNew && can(me, "articles.delete") ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-full border border-danger px-4 py-2 text-[13px] font-bold text-danger hover:bg-danger hover:text-creamy-50"
            >
              {t("delete")}
            </button>
          ) : null}
          {article && canPublish ? (
            <button
              type="button"
              onClick={togglePublish}
              disabled={publishing}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold disabled:opacity-50 ${
                article.status === "published"
                  ? "border border-line text-brown-500 hover:border-brown-400"
                  : "bg-success text-creamy-50 hover:opacity-90"
              }`}
            >
              {publishing ? <SpinnerIcon className="size-3.5" /> : null}
              {article.status === "published" ? t("unpublish") : t("publish")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-brown-500 px-5 py-2 text-[13px] font-bold text-creamy-100 hover:bg-brown-600 disabled:opacity-50"
          >
            {saving ? <SpinnerIcon className="size-3.5" /> : null}
            {t("save")}
          </button>
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-line bg-card p-6">
        {/* Language tabs */}
        <div role="tablist" className="flex gap-1 rounded-xl bg-creamy-200 p-1" style={{ width: "fit-content" }}>
          {(["ar", "en"] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={lang === key}
              onClick={() => setLang(key)}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-bold transition-colors ${
                lang === key ? "bg-card text-brown-900 shadow-sm" : "text-brown-400"
              }`}
            >
              {key === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>

        {lang === "ar" ? (
          <>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleAr")}</label>
              <input value={draft.title_ar} onChange={(e) => patch({ title_ar: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.excerptAr")}</label>
              <textarea
                value={draft.excerpt_ar}
                onChange={(e) => patch({ excerpt_ar: e.target.value })}
                maxLength={300}
                rows={2}
                className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] focus:border-brown-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.bodyAr")}</label>
              <RichTextEditor value={draft.body_ar} onChange={(html) => patch({ body_ar: html })} dir="rtl" placeholder={t("bodyPlaceholder")} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.titleEn")}</label>
              <input dir="ltr" value={draft.title_en} onChange={(e) => patch({ title_en: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.excerptEn")}</label>
              <textarea
                dir="ltr"
                value={draft.excerpt_en}
                onChange={(e) => patch({ excerpt_en: e.target.value })}
                maxLength={300}
                rows={2}
                className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-2.5 text-[14px] focus:border-brown-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-brown-500">{t("fields.bodyEn")}</label>
              <RichTextEditor value={draft.body_en} onChange={(html) => patch({ body_en: html })} dir="ltr" placeholder={t("bodyPlaceholderEn")} />
            </div>
            <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-[12.5px] text-blue-500">{t("enOptional")}</p>
          </>
        )}

        {/* Shared settings */}
        <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <SearchableSelect
            size="sm"
            label={t("fields.category")}
            placeholder={t("noCategory")}
            value={draft.category_id}
            onChange={(v) => patch({ category_id: v || null })}
            options={[
              { value: "", label: t("noCategory") },
              ...categories.map((c) => ({ value: c.id, label: locale === "ar" ? c.name_ar : c.name_en || c.name_ar })),
            ]}
            searchable={false}
          />
          <div>
            <label className="mb-2 block text-[13px] font-bold text-brown-500">{t("fields.slug")}</label>
            <input
              dir="ltr"
              value={draft.slug}
              onChange={(e) => patch({ slug: e.target.value })}
              placeholder={t("slugAuto")}
              className="h-10 w-full rounded-xl border border-line bg-creamy-50 px-3 text-[13.5px] placeholder:text-brown-200 focus:border-brown-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Featured + tags */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-creamy-50 px-4 py-3">
            <input
              type="checkbox"
              checked={draft.is_featured}
              onChange={(e) => patch({ is_featured: e.target.checked })}
              className="size-5 accent-brown-500"
            />
            <span>
              <span className="block text-[13.5px] font-bold text-brown-900">{t("fields.featured")}</span>
              <span className="block text-[12px] text-brown-300">{t("featuredHint")}</span>
            </span>
          </label>
          <div>
            <label className="mb-2 block text-[13px] font-bold text-brown-500">{t("fields.tags")}</label>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-creamy-50 p-2">
              {draft.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-brown-500/10 py-0.5 ps-2 pe-1 text-[12.5px] text-brown-500">
                  {tag}
                  <button type="button" onClick={() => patch({ tags: draft.tags.filter((x) => x !== tag) })} aria-label={`remove ${tag}`} className="text-brown-400 hover:text-danger">✕</button>
                </span>
              ))}
              <input
                type="text"
                placeholder={t("tagsPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const v = (e.target as HTMLInputElement).value.trim().replace(/,$/, "");
                    if (v && !draft.tags.includes(v) && draft.tags.length < 8) patch({ tags: [...draft.tags, v] });
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                className="min-w-[100px] flex-1 bg-transparent px-1 text-[13px] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cover */}
        <div>
          <label className="mb-2 block text-[13px] font-bold text-brown-500">{t("fields.cover")}</label>
          {draft.cover ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.cover.url} alt="" className="h-44 rounded-2xl object-cover" />
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => setPickerOpen(true)} className="text-[13px] font-bold text-blue-500 hover:underline">
                  {t("changeCover")}
                </button>
                <button type="button" onClick={() => patch({ cover: null })} className="text-[13px] font-bold text-danger hover:underline">
                  {t("removeCover")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex h-32 w-full max-w-sm items-center justify-center rounded-2xl border-2 border-dashed border-line text-[14px] text-brown-300 transition-colors hover:border-brown-400 hover:text-brown-500"
            >
              {t("pickCover")}
            </button>
          )}
        </div>
      </div>

      {pickerOpen ? (
        <MediaPicker
          onClose={() => setPickerOpen(false)}
          onPick={(asset) => {
            patch({ cover: asset });
            setPickerOpen(false);
          }}
        />
      ) : null}

      {confirmDelete && article ? (
        <Modal title={t("deleteTitle")} onClose={() => setConfirmDelete(false)}>
          <p className="text-[14.5px] leading-relaxed text-brown-500">{t("deleteBody", { title: article.title_ar })}</p>
          <ModalActions
            confirmLabel={t("deleteCta")}
            onConfirm={async () => {
              try {
                await deleteArticle(article.id);
                toast("success", t("deleted"));
                router.push("/admin/articles");
              } catch (error) {
                toast("danger", error instanceof ApiError ? error.localized(locale) : t("errors.network"));
              }
            }}
            onCancel={() => setConfirmDelete(false)}
            danger
          />
        </Modal>
      ) : null}
    </div>
  );
}
