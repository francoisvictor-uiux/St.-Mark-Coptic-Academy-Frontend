"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  deleteMyDocument,
  deleteMyPhoto,
  getMyProfile,
  patchMyProfile,
  uploadMyDocument,
  uploadMyPhoto,
  type ProfilePatch,
  type StudentProfile,
} from "@/lib/student-api";
import { COUNTRIES } from "@/components/auth/RegisterWizard";
import SearchableSelect from "@/components/auth/SearchableSelect";
import { CheckIcon, SpinnerIcon } from "@/components/auth/icons";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-creamy-50 px-4 font-serif text-[15px] text-brown-900 focus:border-brown-400 focus:outline-none";

/* ─── Completion ring (spec AUTH-09 §4) ─── */

function CompletionRing({ pct }: { pct: number }) {
  const t = useTranslations("portalProfile");
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-28" role="img" aria-label={t("completionLabel", { pct })}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-creamy-500)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={pct === 100 ? "var(--color-success)" : "var(--color-brown-500)"}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 600ms var(--ease-out-quart)" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-archivo text-[22px] font-light text-brown-900" dir="ltr">
        {pct}%
      </span>
    </div>
  );
}

/* ─── Section card scaffold: own save button + saved-check ─── */

function SectionCard({
  title,
  children,
  onSave,
  saveState,
  hideSave,
}: {
  title: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveState?: "idle" | "saving" | "saved";
  hideSave?: boolean;
}) {
  const t = useTranslations("portalProfile");
  return (
    <section className="rounded-card border border-line bg-card p-6 md:p-8">
      <h2 className="mb-5 font-serif text-[18px] font-bold text-brown-900">{title}</h2>
      {children}
      {!hideSave && onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saveState === "saving"}
          className={`mt-5 inline-flex h-11 items-center gap-2 rounded-full px-6 font-serif text-[14.5px] font-bold transition-colors disabled:opacity-60 ${
            saveState === "saved"
              ? "bg-success text-creamy-50"
              : "bg-brown-500 text-creamy-100 hover:bg-brown-600"
          }`}
        >
          {saveState === "saving" ? <SpinnerIcon className="size-4" /> : null}
          {saveState === "saved" ? <CheckIcon className="size-4" /> : null}
          {saveState === "saved" ? t("savedCta") : t("saveCta")}
        </button>
      ) : null}
    </section>
  );
}

/* ─── Screen ─── */

export default function ProfileScreen() {
  const t = useTranslations("portalProfile");
  const locale = useLocale();
  const router = useRouter();
  const { user, status } = useAuth();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfilePatch>({});
  const [saveStates, setSaveStates] = useState<Record<string, "idle" | "saving" | "saved">>({});
  const [uploading, setUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "guest") router.replace("/login");
    else if (status === "authed" && user && user.user_type !== "student") router.replace("/admin");
  }, [status, user, router]);

  const load = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      setDraft({
        gender: data.gender,
        date_of_birth: data.date_of_birth,
        nationality_code: data.nationality_code,
        education_level: data.education_level,
        education_field: data.education_field,
        church_service: data.church_service,
        confession_father: data.confession_father,
        bio: data.bio,
        emergency_name: data.emergency_name,
        emergency_relation: data.emergency_relation,
        emergency_phone: data.emergency_phone,
      });
    } catch {
      setError(t("errors.load"));
    }
  }, [t]);

  useEffect(() => {
    if (status === "authed" && user?.user_type === "student") load();
  }, [status, user, load]);

  function patch(partial: ProfilePatch) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  async function saveSection(key: string, fields: (keyof ProfilePatch)[]) {
    setSaveStates((s) => ({ ...s, [key]: "saving" }));
    setError(null);
    try {
      const payload: ProfilePatch = {};
      for (const field of fields) {
        (payload as Record<string, unknown>)[field] = draft[field] ?? "";
      }
      const updated = await patchMyProfile(payload);
      setProfile(updated);
      setSaveStates((s) => ({ ...s, [key]: "saved" }));
      setTimeout(() => setSaveStates((s) => ({ ...s, [key]: "idle" })), 2000);
    } catch (err) {
      setSaveStates((s) => ({ ...s, [key]: "idle" }));
      setError(
        err instanceof ApiError
          ? err.code === "validation_error" && key === "emergency"
            ? t("errors.emergencyAllOrNone")
            : err.localized(locale)
          : t("errors.network"),
      );
    }
  }

  async function handlePhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setProfile(await uploadMyPhoto(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.localized(locale) : t("errors.network"));
    } finally {
      setUploading(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  async function handleDocument(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setDocUploading(true);
    setError(null);
    try {
      setProfile(await uploadMyDocument(file));
    } catch (err) {
      setError(err instanceof ApiError ? err.localized(locale) : t("errors.network"));
    } finally {
      setDocUploading(false);
      if (docRef.current) docRef.current.value = "";
    }
  }

  if (!profile) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface">
        {error ? (
          <p className="font-serif text-[16px] text-danger">{error}</p>
        ) : (
          <SpinnerIcon className="size-6 text-brown-300" />
        )}
      </main>
    );
  }

  const saveState = (key: string) => saveStates[key] ?? "idle";

  return (
    <main className="min-h-svh bg-surface px-4 py-12 md:py-16">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        <div>
          <Link href="/portal" className="font-serif text-[14px] font-bold text-blue-500 underline-offset-4 hover:underline">
            ← {t("backToPortal")}
          </Link>
        </div>

        {/* Header: title + ring */}
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-line bg-card p-6 md:p-8">
          <div>
            <h1 className="font-display text-[26px] font-bold text-brown-900">{t("title")}</h1>
            <p className="mt-1 max-w-sm font-serif text-[15px] font-light leading-relaxed text-brown-400">
              {t("subtitle")}
            </p>
          </div>
          <CompletionRing pct={profile.completion_pct} />
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-danger-tint px-4 py-3 font-serif text-[14px] text-danger">
            {error}
          </p>
        ) : null}

        {/* ① Photo */}
        <SectionCard title={t("sections.photo")} hideSave>
          <div className="flex items-center gap-5">
            <span className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-creamy-400">
              {profile.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="font-serif text-[28px] font-bold text-brown-500">
                  {user?.first_name_ar?.slice(0, 1) ?? "✢"}
                </span>
              )}
              {uploading ? (
                <span className="absolute inset-0 flex items-center justify-center bg-brown-900/40">
                  <SpinnerIcon className="size-6 text-creamy-100" />
                </span>
              ) : null}
            </span>
            <div className="flex flex-col gap-2">
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => handlePhoto(e.target.files)} />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="w-fit rounded-full border border-brown-500 px-5 py-2 font-serif text-[14px] font-bold text-brown-500 hover:bg-brown-500/5"
              >
                {profile.photo_url ? t("changePhoto") : t("uploadPhoto")}
              </button>
              {profile.photo_url ? (
                <button
                  type="button"
                  onClick={async () => setProfile(await deleteMyPhoto())}
                  className="w-fit font-serif text-[13px] font-bold text-danger hover:underline"
                >
                  {t("removePhoto")}
                </button>
              ) : (
                <p className="font-serif text-[12.5px] text-brown-300">{t("photoHint")}</p>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ② Basic */}
        <SectionCard title={t("sections.basic")} onSave={() => saveSection("basic", ["gender", "date_of_birth", "nationality_code"])} saveState={saveState("basic")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 font-serif text-[14px] font-bold text-brown-500">{t("fields.gender")}</legend>
              <div className="flex gap-2">
                {(["male", "female"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={draft.gender === value}
                    onClick={() => patch({ gender: value })}
                    className={`h-11 flex-1 rounded-xl border font-serif text-[14.5px] font-bold transition-colors ${
                      draft.gender === value
                        ? "border-brown-500 bg-brown-500 text-creamy-100"
                        : "border-line bg-creamy-50 text-brown-400 hover:border-brown-400"
                    }`}
                  >
                    {t(`gender.${value}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="mb-2 block font-serif text-[14px] font-bold text-brown-500">{t("fields.dob")}</label>
              <input
                type="date" dir="ltr"
                value={draft.date_of_birth ?? ""}
                onChange={(e) => patch({ date_of_birth: e.target.value || null })}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <SearchableSelect
                label={t("fields.nationality")}
                placeholder={t("fields.nationalityPlaceholder")}
                value={draft.nationality_code || null}
                onChange={(v) => patch({ nationality_code: v ?? "" })}
                options={COUNTRIES.map((c) => ({ value: c.code, label: locale === "ar" ? c.ar : c.en }))}
              />
            </div>
          </div>
        </SectionCard>

        {/* ③ Education */}
        <SectionCard title={t("sections.education")} onSave={() => saveSection("education", ["education_level", "education_field"])} saveState={saveState("education")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              label={t("fields.educationLevel")}
              placeholder={t("fields.educationLevelPlaceholder")}
              searchable={false}
              value={draft.education_level || null}
              onChange={(v) => patch({ education_level: (v ?? "") as ProfilePatch["education_level"] })}
              options={(["secondary", "bachelor", "master", "doctorate", "other"] as const).map((value) => ({
                value,
                label: t(`educationLevels.${value}`),
              }))}
            />
            <div>
              <label className="mb-2 block font-serif text-[14px] font-bold text-brown-500">{t("fields.educationField")}</label>
              <input value={draft.education_field ?? ""} onChange={(e) => patch({ education_field: e.target.value })} className={inputCls} />
            </div>
          </div>
        </SectionCard>

        {/* ④ Church */}
        <SectionCard title={t("sections.church")} onSave={() => saveSection("church", ["church_service", "confession_father"])} saveState={saveState("church")}>
          {profile.church_name || profile.diocese_name ? (
            <p className="mb-4 rounded-xl bg-creamy-200 px-4 py-3 font-serif text-[13.5px] text-brown-400">
              {t("registeredChurch")}{" "}
              <span className="font-bold text-brown-500">
                {[profile.church_name, profile.diocese_name].filter(Boolean).join(" — ")}
              </span>
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-serif text-[14px] font-bold text-brown-500">{t("fields.churchService")}</label>
              <input value={draft.church_service ?? ""} onChange={(e) => patch({ church_service: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="mb-2 block font-serif text-[14px] font-bold text-brown-500">{t("fields.confessionFather")}</label>
              <input value={draft.confession_father ?? ""} onChange={(e) => patch({ confession_father: e.target.value })} className={inputCls} />
            </div>
          </div>
        </SectionCard>

        {/* ⑤ Emergency */}
        <SectionCard title={t("sections.emergency")} onSave={() => saveSection("emergency", ["emergency_name", "emergency_relation", "emergency_phone"])} saveState={saveState("emergency")}>
          <p className="mb-4 font-serif text-[13px] text-brown-300">{t("emergencyHint")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block font-serif text-[14px] font-bold text-brown-500">{t("fields.emergencyName")}</label>
              <input value={draft.emergency_name ?? ""} onChange={(e) => patch({ emergency_name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="mb-2 block font-serif text-[14px] font-bold text-brown-500">{t("fields.emergencyRelation")}</label>
              <input value={draft.emergency_relation ?? ""} onChange={(e) => patch({ emergency_relation: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="mb-2 block font-serif text-[14px] font-bold text-brown-500">{t("fields.emergencyPhone")}</label>
              <input dir="ltr" type="tel" value={draft.emergency_phone ?? ""} onChange={(e) => patch({ emergency_phone: e.target.value })} className={inputCls} />
            </div>
          </div>
        </SectionCard>

        {/* ⑥ Bio */}
        <SectionCard title={t("sections.bio")} onSave={() => saveSection("bio", ["bio"])} saveState={saveState("bio")}>
          <textarea
            value={draft.bio ?? ""}
            onChange={(e) => patch({ bio: e.target.value })}
            maxLength={500}
            rows={4}
            className="w-full rounded-xl border border-line bg-creamy-50 px-4 py-3 font-serif text-[15px] leading-relaxed text-brown-900 focus:border-brown-400 focus:outline-none"
          />
          <p className="mt-1 text-end font-serif text-[12px] text-brown-300" dir="ltr" aria-live={((draft.bio ?? "").length >= 450) ? "polite" : "off"}>
            {(draft.bio ?? "").length}/500
          </p>
        </SectionCard>

        {/* ⑦ Documents */}
        <SectionCard title={t("sections.documents")} hideSave>
          <p className="mb-4 font-serif text-[13px] text-brown-300">{t("documentsHint")}</p>
          {profile.documents.length > 0 ? (
            <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
              {profile.documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[14px] font-bold text-brown-900" dir="ltr">
                      {doc.original_name}
                    </span>
                    <span className="font-serif text-[12px] text-brown-300" dir="ltr">
                      {(doc.size_bytes / 1024).toFixed(0)}KB · {doc.mime.split("/")[1].toUpperCase()}
                      {doc.verified_at ? ` · ${t("verified")}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteMyDocument(doc.id);
                      load();
                    }}
                    className="shrink-0 font-serif text-[13px] font-bold text-danger hover:underline"
                  >
                    {t("deleteDocument")}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input ref={docRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => handleDocument(e.target.files)} />
          <button
            type="button"
            onClick={() => docRef.current?.click()}
            disabled={docUploading || profile.documents.length >= 5}
            className="inline-flex items-center gap-2 rounded-full border border-brown-500 px-5 py-2 font-serif text-[14px] font-bold text-brown-500 hover:bg-brown-500/5 disabled:opacity-50"
          >
            {docUploading ? <SpinnerIcon className="size-4" /> : null}
            {profile.documents.length >= 5 ? t("documentsFull") : t("uploadDocument")}
          </button>
        </SectionCard>
      </div>
    </main>
  );
}
