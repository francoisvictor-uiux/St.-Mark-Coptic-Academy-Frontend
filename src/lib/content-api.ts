/** Typed client for the CMS APIs (admin + public). */

import { authedRequest } from "./api";
import type { Paginated } from "./admin-api";

export type PublishStatus = "draft" | "published" | "archived";

export type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  article_count: number;
};

export type MediaAsset = {
  id: string;
  url: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  width: number;
  height: number;
  alt_ar: string;
  alt_en: string;
  created_at: string;
};

export type Article = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  category: Category | null;
  cover: MediaAsset | null;
  status: PublishStatus;
  is_featured: boolean;
  tags: string[];
  views: number;
  published_at: string | null;
  author_label: string;
  created_at: string;
  updated_at: string;
};

export type ArticleDetail = Article & { body_ar: string; body_en: string };

export type ArticlePayload = Partial<{
  title_ar: string;
  title_en: string;
  slug: string;
  excerpt_ar: string;
  excerpt_en: string;
  body_ar: string;
  body_en: string;
  cover_id: string | null;
  category_id: string | null;
  is_featured: boolean;
  tags: string[];
}>;

export type EventItem = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  event_type: "conference" | "seminar" | "discussion";
  starts_at: string;
  ends_at: string | null;
  location_ar: string;
  location_en: string;
  capacity_status: "open" | "full" | "online";
  cover: MediaAsset | null;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventPayload = Partial<{
  title_ar: string;
  title_en: string;
  slug: string;
  description_ar: string;
  description_en: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location_ar: string;
  location_en: string;
  capacity_status: string;
  cover_id: string | null;
}>;

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

// ─── Categories ───

export function listCategories() {
  return authedRequest<{ categories: Category[] }>("/admin/content/categories");
}

export function createCategory(payload: { name_ar: string; name_en?: string }) {
  return authedRequest<Category>("/admin/content/categories", json("POST", payload));
}

export function updateCategory(id: string, payload: Partial<{ name_ar: string; name_en: string; is_active: boolean }>) {
  return authedRequest<Category>(`/admin/content/categories/${id}`, json("PATCH", payload));
}

export function deleteCategory(id: string) {
  return authedRequest<void>(`/admin/content/categories/${id}`, { method: "DELETE" });
}

// ─── Media ───

export function listMedia(params: { q?: string; cursor?: string } = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.cursor) search.set("cursor", params.cursor);
  const qs = search.toString();
  return authedRequest<Paginated<MediaAsset>>(`/admin/content/media${qs ? `?${qs}` : ""}`);
}

export function uploadMedia(file: File, altAr = "") {
  const form = new FormData();
  form.append("file", file);
  if (altAr) form.append("alt_ar", altAr);
  return authedRequest<MediaAsset>("/admin/content/media", { method: "POST", body: form });
}

export function updateMedia(id: string, payload: { alt_ar?: string; alt_en?: string }) {
  return authedRequest<MediaAsset>(`/admin/content/media/${id}`, json("PATCH", payload));
}

export function deleteMedia(id: string) {
  return authedRequest<void>(`/admin/content/media/${id}`, { method: "DELETE" });
}

// ─── Articles ───

export function listArticles(params: { q?: string; status?: string; category?: string; cursor?: string } = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const qs = search.toString();
  return authedRequest<Paginated<Article>>(`/admin/content/articles${qs ? `?${qs}` : ""}`);
}

export function createArticle(payload: ArticlePayload & { title_ar: string }) {
  return authedRequest<ArticleDetail>("/admin/content/articles", json("POST", payload));
}

export function getArticle(id: string) {
  return authedRequest<ArticleDetail>(`/admin/content/articles/${id}`);
}

export function updateArticle(id: string, payload: ArticlePayload) {
  return authedRequest<ArticleDetail>(`/admin/content/articles/${id}`, json("PATCH", payload));
}

export function deleteArticle(id: string) {
  return authedRequest<void>(`/admin/content/articles/${id}`, { method: "DELETE" });
}

export function setArticleStatus(id: string, action: "publish" | "unpublish" | "archive") {
  return authedRequest<ArticleDetail>(`/admin/content/articles/${id}/${action}`, { method: "POST" });
}

// ─── Events ───

export function listEvents(params: { q?: string; status?: string; cursor?: string } = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const qs = search.toString();
  return authedRequest<Paginated<EventItem>>(`/admin/content/events${qs ? `?${qs}` : ""}`);
}

export function createEvent(payload: EventPayload & { title_ar: string; event_type: string; starts_at: string }) {
  return authedRequest<EventItem>("/admin/content/events", json("POST", payload));
}

export function getEvent(id: string) {
  return authedRequest<EventItem>(`/admin/content/events/${id}`);
}

export function updateEvent(id: string, payload: EventPayload) {
  return authedRequest<EventItem>(`/admin/content/events/${id}`, json("PATCH", payload));
}

export function deleteEvent(id: string) {
  return authedRequest<void>(`/admin/content/events/${id}`, { method: "DELETE" });
}

export function setEventStatus(id: string, action: "publish" | "unpublish" | "archive") {
  return authedRequest<EventItem>(`/admin/content/events/${id}/${action}`, { method: "POST" });
}

// ─── News ───

export type NewsItem = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  cover: MediaAsset | null;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsDetail = NewsItem & { body_ar: string; body_en: string };

export type NewsPayload = Partial<{
  title_ar: string;
  title_en: string;
  slug: string;
  excerpt_ar: string;
  excerpt_en: string;
  body_ar: string;
  body_en: string;
  cover_id: string | null;
}>;

export function listNews(params: { q?: string; status?: string; cursor?: string } = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const qs = search.toString();
  return authedRequest<Paginated<NewsItem>>(`/admin/content/news${qs ? `?${qs}` : ""}`);
}

export function createNews(payload: NewsPayload & { title_ar: string }) {
  return authedRequest<NewsDetail>("/admin/content/news", json("POST", payload));
}

export function getNews(id: string) {
  return authedRequest<NewsDetail>(`/admin/content/news/${id}`);
}

export function updateNews(id: string, payload: NewsPayload) {
  return authedRequest<NewsDetail>(`/admin/content/news/${id}`, json("PATCH", payload));
}

export function deleteNews(id: string) {
  return authedRequest<void>(`/admin/content/news/${id}`, { method: "DELETE" });
}

export function setNewsStatus(id: string, action: "publish" | "unpublish" | "archive") {
  return authedRequest<NewsDetail>(`/admin/content/news/${id}/${action}`, { method: "POST" });
}

// ─── Pages ───

export type SitePage = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  status: PublishStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PagePayload = Partial<{
  title_ar: string;
  title_en: string;
  slug: string;
  body_ar: string;
  body_en: string;
}>;

export function listPages() {
  return authedRequest<Paginated<SitePage>>("/admin/content/pages");
}

export function createPage(payload: PagePayload & { title_ar: string }) {
  return authedRequest<SitePage>("/admin/content/pages", json("POST", payload));
}

export function getPage(id: string) {
  return authedRequest<SitePage>(`/admin/content/pages/${id}`);
}

export function updatePage(id: string, payload: PagePayload) {
  return authedRequest<SitePage>(`/admin/content/pages/${id}`, json("PATCH", payload));
}

export function deletePage(id: string) {
  return authedRequest<void>(`/admin/content/pages/${id}`, { method: "DELETE" });
}

export function setPageStatus(id: string, action: "publish" | "unpublish") {
  return authedRequest<SitePage>(`/admin/content/pages/${id}/${action}`, { method: "POST" });
}

// ─── FAQs ───

export type FaqItem = {
  id: string;
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export type FaqPayload = Partial<Omit<FaqItem, "id" | "sort_order" | "created_at">>;

export function listFaqs() {
  return authedRequest<{ faqs: FaqItem[] }>("/admin/content/faqs");
}

export function createFaq(payload: FaqPayload & { question_ar: string; answer_ar: string }) {
  return authedRequest<FaqItem>("/admin/content/faqs", json("POST", payload));
}

export function updateFaq(id: string, payload: FaqPayload) {
  return authedRequest<FaqItem>(`/admin/content/faqs/${id}`, json("PATCH", payload));
}

export function deleteFaq(id: string) {
  return authedRequest<void>(`/admin/content/faqs/${id}`, { method: "DELETE" });
}

export function reorderFaqs(orderedIds: string[]) {
  return authedRequest<{ faqs: FaqItem[] }>("/admin/content/faqs/reorder", {
    method: "PUT",
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}

// ─── Homepage settings ───

export type HomepageSettings = {
  hero_title_ar?: string;
  hero_title_en?: string;
  hero_subtitle_ar?: string;
  hero_subtitle_en?: string;
  hero_eyebrow_ar?: string;
  hero_eyebrow_en?: string;
};

export function getHomepageSettings() {
  return authedRequest<{ homepage: HomepageSettings }>("/admin/content/homepage");
}

export function saveHomepageSettings(payload: HomepageSettings) {
  return authedRequest<{ homepage: HomepageSettings }>("/admin/content/homepage", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Homepage collections (generic sortable CRUD) ───

export type Testimonial = {
  id: string;
  name_ar: string; name_en: string;
  role_ar: string; role_en: string;
  quote_ar: string; quote_en: string;
  sort_order: number; is_published: boolean; created_at: string;
};

export type Partner = {
  id: string;
  name_ar: string; name_en: string;
  logo: MediaAsset | null;
  url: string;
  sort_order: number; is_published: boolean; created_at: string;
};

export type GalleryEntry = {
  id: string;
  media: MediaAsset;
  caption_ar: string; caption_en: string;
  sort_order: number; is_published: boolean; created_at: string;
};

export type Thesis = {
  id: string;
  title_ar: string; title_en: string;
  researcher_ar: string; researcher_en: string;
  degree: "masters" | "doctorate";
  institution_ar: string; institution_en: string;
  year: number;
  sort_order: number; is_published: boolean; created_at: string;
};

export type Program = {
  id: string;
  slug: string;
  name_ar: string; name_en: string;
  description_ar: string; description_en: string;
  duration_ar: string; duration_en: string;
  enrollment_status: "open" | "soon" | "closed";
  cover: MediaAsset | null;
  sort_order: number; is_published: boolean; created_at: string;
};

export type CollectionApi<T> = {
  list: () => Promise<T[]>;
  create: (payload: Record<string, unknown>) => Promise<T>;
  patch: (id: string, payload: Record<string, unknown>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<T[]>;
};

function collectionApi<T>(base: string, listKey: string): CollectionApi<T> {
  return {
    list: async () => {
      const data = await authedRequest<Record<string, T[]>>(base);
      return data[listKey] ?? [];
    },
    create: (payload) => authedRequest<T>(base, json("POST", payload)),
    patch: (id, payload) => authedRequest<T>(`${base}/${id}`, json("PATCH", payload)),
    remove: (id) => authedRequest<void>(`${base}/${id}`, { method: "DELETE" }),
    reorder: async (orderedIds) => {
      const data = await authedRequest<Record<string, T[]>>(`${base}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ ordered_ids: orderedIds }),
      });
      return data[listKey] ?? [];
    },
  };
}

export const testimonialsApi = collectionApi<Testimonial>("/admin/content/testimonials", "items");
export const partnersApi = collectionApi<Partner>("/admin/content/partners", "items");
export const galleryApi = collectionApi<GalleryEntry>("/admin/content/gallery", "items");
export const thesesApi = collectionApi<Thesis>("/admin/content/theses", "items");
export const programsApi = collectionApi<Program>("/admin/programs", "programs");

// ─── Nested homepage settings (v2) ───

export type HomeSettings = {
  hero?: Record<string, string>;
  vision?: Record<string, string>;
  sections?: Record<string, string>;
  stats?: { value: number; label_ar: string; label_en: string }[];
  features?: { title_ar: string; title_en: string; summary_ar: string; summary_en: string; body_ar: string; body_en: string }[];
};

export function getHomeSettings() {
  return authedRequest<{ homepage: HomeSettings }>("/admin/content/homepage-v2");
}

export function saveHomeSettings(payload: HomeSettings) {
  return authedRequest<{ homepage: HomeSettings }>("/admin/content/homepage-v2", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
