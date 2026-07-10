/** Server-side fetchers for published CMS content (public APIs, no auth). */

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";
const REVALIDATE = 60; // seconds — fallback window if on-demand revalidation is missed

/**
 * Cache tag every public CMS fetch carries. The admin dashboard triggers
 * `revalidateTag(CMS_TAG)` (via POST /api/revalidate) after each content
 * mutation, so edits appear on the live site immediately; the 60s ISR window
 * above is just a safety net.
 */
export const CMS_TAG = "cms-content";

export type PublicMedia = { url: string; alt_ar: string; alt_en: string };

export type PublicArticle = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  category: { slug: string; name_ar: string; name_en: string } | null;
  cover: PublicMedia | null;
  published_at: string | null;
  author_label: string;
  reading_minutes: number;
};

export type PublicArticleDetail = PublicArticle & { body_ar: string; body_en: string };

export type PublicEvent = {
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
  cover: PublicMedia | null;
};

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BACKEND}/api/v1${path}`, { next: { revalidate: REVALIDATE, tags: [CMS_TAG] } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    // Backend down (e.g. static build without Django) — render placeholders.
    return fallback;
  }
}

export async function getPublishedArticles(): Promise<PublicArticle[]> {
  const page = await safeFetch<{ results: PublicArticle[] }>("/content/articles", { results: [] });
  return page.results ?? [];
}

// ── Articles page: rich card shape + faceted query ──

export type ArticleCard = PublicArticle & {
  is_featured: boolean;
  tags: string[];
  views: number;
  reading_minutes: number;
};

export type ArticleFacets = {
  total_articles: number;
  categories: { slug: string; name_ar: string; name_en: string; count: number }[];
  authors: { id: string; name_ar: string; name_en: string; count: number }[];
  years: number[];
  tags: { tag: string; count: number }[];
  recent: ArticleCard[];
};

export type ArticlesResponse = {
  results: ArticleCard[];
  page: number;
  pages: number;
  total: number;
  facets: ArticleFacets;
};

export type ArticleQuery = {
  q?: string; category?: string; author?: string; year?: string;
  tag?: string; reading_time?: string; sort?: string; featured?: string;
  page?: number; page_size?: number;
};

export async function queryArticles(params: ArticleQuery): Promise<ArticlesResponse> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) search.set(k, String(v));
  }
  const qs = search.toString();
  return safeFetch<ArticlesResponse>(`/content/articles${qs ? `?${qs}` : ""}`, {
    results: [], page: 1, pages: 1, total: 0,
    facets: { total_articles: 0, categories: [], authors: [], years: [], tags: [], recent: [] },
  });
}

export async function getFeaturedArticles(): Promise<ArticleCard[]> {
  const data = await safeFetch<{ results: ArticleCard[] }>("/content/articles/featured", { results: [] });
  return data.results ?? [];
}

export async function getArticleBySlug(slug: string): Promise<PublicArticleDetail | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/content/articles/${encodeURIComponent(slug)}`, {
      next: { revalidate: REVALIDATE, tags: [CMS_TAG] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicArticleDetail;
  } catch {
    return null;
  }
}

export async function getPublishedEvents(scope?: "upcoming" | "past"): Promise<PublicEvent[]> {
  return safeFetch<PublicEvent[]>(`/content/events${scope ? `?scope=${scope}` : ""}`, []);
}

/** Arabic-primary bilingual pick. */
export function pickLang(locale: string, ar: string, en: string): string {
  return locale === "en" && en ? en : ar;
}

export function formatDate(locale: string, iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Map API articles → the homepage section card shape. */
export function toSectionArticles(articles: PublicArticle[], locale: string) {
  return articles.slice(0, 3).map((a) => ({
    category: a.category ? pickLang(locale, a.category.name_ar, a.category.name_en) : "",
    title: pickLang(locale, a.title_ar, a.title_en),
    excerpt: pickLang(locale, a.excerpt_ar, a.excerpt_en),
    author: a.author_label || "—",
    date: formatDate(locale, a.published_at),
    minutes: a.reading_minutes,
    access: "public" as const,
    image: a.cover?.url ?? "/images/photo-1.jpg",
    href: `/articles/${a.slug}`,
  }));
}

/** Map API events → the homepage section row shape. */
export function toSectionEvents(events: PublicEvent[], locale: string) {
  const arabic = locale === "ar";
  return events.slice(0, 6).map((e) => {
    const starts = new Date(e.starts_at);
    const time = new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-GB", {
      hour: "numeric",
      minute: "2-digit",
    }).format(starts);
    return {
      type: e.event_type,
      title: pickLang(locale, e.title_ar, e.title_en),
      day: String(starts.getUTCDate()),
      month: new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-GB", { month: "long" }).format(starts),
      year: String(starts.getUTCFullYear()),
      dateRange: time,
      location: pickLang(locale, e.location_ar, e.location_en) || (arabic ? "يُعلن لاحقًا" : "TBA"),
      status: e.capacity_status,
    };
  });
}

// ─── CMS pass 2: news, pages, FAQs, homepage overrides ───

export type PublicNews = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  excerpt_ar: string;
  excerpt_en: string;
  cover: PublicMedia | null;
  published_at: string | null;
};

export type PublicNewsDetail = PublicNews & { body_ar: string; body_en: string };

export type PublicPage = {
  slug: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
};

export type PublicFaq = {
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
};

export type HomepageOverrides = {
  hero_title_ar?: string;
  hero_title_en?: string;
  hero_subtitle_ar?: string;
  hero_subtitle_en?: string;
  hero_eyebrow_ar?: string;
  hero_eyebrow_en?: string;
};

export async function getPublishedNews(): Promise<PublicNews[]> {
  const page = await safeFetch<{ results: PublicNews[] }>("/content/news", { results: [] });
  return page.results ?? [];
}

export async function getNewsBySlug(slug: string): Promise<PublicNewsDetail | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/content/news/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60, tags: [CMS_TAG] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicNewsDetail;
  } catch {
    return null;
  }
}

export async function getPageBySlug(slug: string): Promise<PublicPage | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/content/pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60, tags: [CMS_TAG] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicPage;
  } catch {
    return null;
  }
}

export async function getPublicFaqs(): Promise<PublicFaq[]> {
  const data = await safeFetch<{ faqs: PublicFaq[] }>("/content/faqs", { faqs: [] });
  return data.faqs ?? [];
}

export async function getHomepageOverrides(): Promise<HomepageOverrides> {
  const data = await safeFetch<{ homepage: HomepageOverrides }>("/content/homepage", { homepage: {} });
  return data.homepage ?? {};
}

/** Map API FAQs → the homepage section item shape. */
export function toSectionFaqs(faqs: PublicFaq[], locale: string) {
  return faqs.map((f) => ({
    question: pickLang(locale, f.question_ar, f.question_en),
    answer: pickLang(locale, f.answer_ar, f.answer_en),
  }));
}

/** Hero override texts for the given locale (undefined → keep the built-in copy). */
export function toHeroOverrides(overrides: HomepageOverrides, locale: string) {
  const pick = (ar?: string, en?: string) =>
    (locale === "en" ? en || ar : ar) || undefined;
  return {
    eyebrow: pick(overrides.hero_eyebrow_ar, overrides.hero_eyebrow_en),
    title: pick(overrides.hero_title_ar, overrides.hero_title_en),
    subtitle: pick(overrides.hero_subtitle_ar, overrides.hero_subtitle_en),
  };
}

// ─── Composite homepage payload ───

export type HomeData = {
  settings: {
    hero?: Record<string, string>;
    vision?: Record<string, string>;
    sections?: Record<string, string>;
    stats?: { value: number; label_ar: string; label_en: string }[];
    features?: Record<string, string>[];
  };
  testimonials: { name_ar: string; name_en: string; role_ar: string; role_en: string; quote_ar: string; quote_en: string }[];
  partners: { name_ar: string; name_en: string; url: string; logo: PublicMedia | null }[];
  gallery: { media: PublicMedia & { url: string }; caption_ar: string; caption_en: string }[];
  theses: { title_ar: string; title_en: string; researcher_ar: string; researcher_en: string; degree: string; institution_ar: string; institution_en: string; year: number }[];
  programs: { slug: string; name_ar: string; name_en: string; description_ar: string; description_en: string; duration_ar: string; duration_en: string; enrollment_status: string; cover_url: string }[];
};

export async function getHomeData(): Promise<HomeData> {
  return safeFetch<HomeData>("/content/home", {
    settings: {}, testimonials: [], partners: [], gallery: [], theses: [], programs: [],
  });
}

/** locale-aware getter over a {key_ar,key_en} record group; empty → undefined. */
function pickField(group: Record<string, string> | undefined, base: string, locale: string): string | undefined {
  if (!group) return undefined;
  const ar = group[`${base}_ar`] ?? "";
  const en = group[`${base}_en`] ?? "";
  return (locale === "en" ? en || ar : ar) || undefined;
}

export function mapHome(data: HomeData, locale: string) {
  const s = data.settings;
  const sec = (base: string) => pickField(s.sections, base, locale);

  return {
    hero: {
      eyebrow: pickField(s.hero, "eyebrow", locale),
      title: pickField(s.hero, "title", locale),
      subtitle: pickField(s.hero, "subtitle", locale),
      patronPrefix: pickField(s.hero, "patron_prefix", locale),
      patron: pickField(s.hero, "patron", locale),
      ctaPrimary: pickField(s.hero, "cta_primary", locale),
      ctaSecondary: pickField(s.hero, "cta_secondary", locale),
    },
    vision: {
      label: pickField(s.vision, "label", locale),
      subtitle: pickField(s.vision, "subtitle", locale),
      cardTitle: pickField(s.vision, "card_title", locale),
      body: pickField(s.vision, "body", locale),
      image1: s.vision?.image_1 || undefined,
      image2: s.vision?.image_2 || undefined,
      stats: (s.stats ?? []).filter((x) => x.label_ar || x.label_en).map((x) => ({
        value: x.value,
        label: pickLang(locale, x.label_ar, x.label_en),
      })),
    },
    features: {
      labels: { label: sec("features_label"), subtitle: sec("features_subtitle") },
      items: (s.features ?? [])
        .filter((f) => f.title_ar || f.title_en)
        .map((f, i) => ({
          index: String(i + 1).padStart(2, "0"),
          title: pickLang(locale, f.title_ar ?? "", f.title_en ?? ""),
          summary: pickLang(locale, f.summary_ar ?? "", f.summary_en ?? ""),
          body: pickLang(locale, f.body_ar ?? "", f.body_en ?? ""),
        })),
    },
    programs: {
      labels: { label: sec("programs_label"), subtitle: sec("programs_subtitle") },
      items: data.programs.map((p) => ({
        id: p.slug,
        title: pickLang(locale, p.name_ar, p.name_en),
        description: pickLang(locale, p.description_ar, p.description_en),
        duration: pickLang(locale, p.duration_ar, p.duration_en),
        status: (p.enrollment_status || "open") as "open" | "soon" | "closed",
        image: p.cover_url || "/images/photo-2.jpg",
      })),
    },
    theses: {
      labels: { label: sec("theses_label"), subtitle: sec("theses_subtitle") },
      items: data.theses.map((x) => ({
        title: pickLang(locale, x.title_ar, x.title_en),
        researcher: pickLang(locale, x.researcher_ar, x.researcher_en),
        degree: x.degree === "doctorate" ? (locale === "en" ? "PhD" : "دكتوراه") : (locale === "en" ? "Master's" : "ماجستير"),
        institution: pickLang(locale, x.institution_ar, x.institution_en),
        year: String(x.year),
      })),
    },
    testimonials: {
      labels: { label: sec("testimonials_label"), subtitle: sec("testimonials_subtitle") },
      items: data.testimonials.map((x) => ({
        name: pickLang(locale, x.name_ar, x.name_en),
        role: pickLang(locale, x.role_ar, x.role_en),
        quote: pickLang(locale, x.quote_ar, x.quote_en),
      })),
    },
    partners: {
      label: sec("partners_label"),
      items: data.partners
        .filter((p) => p.logo)
        .map((p) => ({ src: p.logo!.url, name: pickLang(locale, p.name_ar, p.name_en) })),
    },
    gallery: {
      labels: { label: sec("gallery_label"), subtitle: sec("gallery_subtitle") },
      images: data.gallery.map((g) => ({
        image: g.media.url,
        text: pickLang(locale, g.caption_ar, g.caption_en),
      })),
    },
    apply: {
      labels: { label: sec("apply_label"), subtitle: sec("apply_subtitle"), intro: sec("apply_intro") },
      programOptions: data.programs.map((p) => ({
        value: p.slug,
        label: pickLang(locale, p.name_ar, p.name_en),
      })),
    },
  };
}
