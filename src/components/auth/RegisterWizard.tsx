"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ApiError,
  checkEmail,
  register,
  registrationOptions,
  type RegistrationOptions,
} from "@/lib/api";
import Field from "./Field";
import PasswordField, { passwordScore } from "./PasswordField";
import FormBanner from "./FormBanner";
import SubmitButton from "./SubmitButton";
import Stepper from "./Stepper";
import SearchableSelect from "./SearchableSelect";
import SuccessCheck from "./SuccessCheck";
import VerifyEmailStep from "./VerifyEmailStep";

/** Diaspora-first country list (spec AUTH-02: pinned popular countries). */
export const COUNTRIES: { code: string; ar: string; en: string }[] = [
  { code: "EG", ar: "مصر", en: "Egypt" },
  { code: "US", ar: "الولايات المتحدة", en: "United States" },
  { code: "CA", ar: "كندا", en: "Canada" },
  { code: "AU", ar: "أستراليا", en: "Australia" },
  { code: "GB", ar: "المملكة المتحدة", en: "United Kingdom" },
  { code: "DE", ar: "ألمانيا", en: "Germany" },
  { code: "FR", ar: "فرنسا", en: "France" },
  { code: "IT", ar: "إيطاليا", en: "Italy" },
  { code: "NL", ar: "هولندا", en: "Netherlands" },
  { code: "AT", ar: "النمسا", en: "Austria" },
  { code: "SE", ar: "السويد", en: "Sweden" },
  { code: "GR", ar: "اليونان", en: "Greece" },
  { code: "AE", ar: "الإمارات", en: "UAE" },
  { code: "SA", ar: "السعودية", en: "Saudi Arabia" },
  { code: "KW", ar: "الكويت", en: "Kuwait" },
  { code: "JO", ar: "الأردن", en: "Jordan" },
  { code: "LB", ar: "لبنان", en: "Lebanon" },
  { code: "SD", ar: "السودان", en: "Sudan" },
  { code: "ET", ar: "إثيوبيا", en: "Ethiopia" },
  { code: "KE", ar: "كينيا", en: "Kenya" },
];

const ARABIC_NAME = /^[؀-ۿ\s]{2,50}$/;
const LATIN_NAME = /^[A-Za-z\s.'-]{2,100}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DRAFT_KEY = "smca_register_draft";

type Draft = {
  firstNameAr: string;
  lastNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  country: string | null;
  diocese: string | null;
  church: string | null;
  churchOther: string;
  program: string | null;
};

const emptyDraft: Draft = {
  firstNameAr: "",
  lastNameAr: "",
  fullNameEn: "",
  email: "",
  phone: "",
  country: null,
  diocese: null,
  church: null,
  churchOther: "",
  program: null,
};

function normalizePhone(raw: string) {
  return raw
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\s()-]/g, "");
}

type RegisterWizardProps = {
  /** Set when redirected from login with an unverified account. */
  initialVerifyEmail?: string;
};

export default function RegisterWizard({ initialVerifyEmail }: RegisterWizardProps) {
  const t = useTranslations("auth.register");
  const tShared = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [stage, setStage] = useState<"form" | "verify" | "success">(
    initialVerifyEmail ? "verify" : "form",
  );
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading">("idle");
  const [verifyEmailAddr, setVerifyEmailAddr] = useState(initialVerifyEmail ?? "");
  const [firstNameVerified, setFirstNameVerified] = useState("");
  const [restored, setRestored] = useState(false);
  const [emailCheck, setEmailCheck] = useState<"idle" | "pending" | "ok" | "taken">("idle");
  const [options, setOptions] = useState<RegistrationOptions | null>(null);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);

  const steps = [t("steps.account"), t("steps.academic"), t("steps.verify")];

  // Draft restore (never passwords) — spec AUTH-02 §7.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw && !initialVerifyEmail) {
        setDraft({ ...emptyDraft, ...JSON.parse(raw) });
        setRestored(true);
      }
    } catch {
      /* corrupt/unavailable draft — start clean */
    }
    registrationOptions().then(setOptions).catch(() => setOptions(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== "form") return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, stage]);

  useEffect(() => {
    stepTitleRef.current?.focus();
  }, [step, stage]);

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function clearError(key: string) {
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  const emailLocalPart = draft.email.split("@")[0] ?? "";

  const handleEmailBlur = useCallback(async () => {
    const email = draft.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return;
    setEmailCheck("pending");
    try {
      const { available } = await checkEmail(email);
      setEmailCheck(available ? "ok" : "taken");
      if (!available) {
        setErrors((e) => ({ ...e, email: t("errors.emailTaken") }));
      }
    } catch {
      setEmailCheck("idle");
    }
  }, [draft.email, t]);

  function validateStep0() {
    const e: Record<string, string> = {};
    if (!ARABIC_NAME.test(draft.firstNameAr.trim())) e.firstNameAr = t("errors.arabicName");
    if (!ARABIC_NAME.test(draft.lastNameAr.trim())) e.lastNameAr = t("errors.arabicName");
    if (!LATIN_NAME.test(draft.fullNameEn.trim())) e.fullNameEn = t("errors.latinName");
    if (!EMAIL_RE.test(draft.email.trim().toLowerCase())) e.email = t("errors.email");
    else if (emailCheck === "taken") e.email = t("errors.emailTaken");
    const phone = normalizePhone(draft.phone);
    if (phone && !/^\+?[0-9]{8,15}$/.test(phone)) e.phone = t("errors.phone");
    if (password.length < 10) e.password = t("errors.passwordLength");
    else if (passwordScore(password, emailLocalPart) < 3) e.password = t("errors.passwordWeak");
    if (confirm !== password) e.confirm = t("errors.confirmMismatch");
    if (!terms) e.terms = t("errors.terms");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!draft.country) e.country = t("errors.required");
    const dioceses = countryDioceses;
    if (dioceses.length > 0 && !draft.diocese) e.diocese = t("errors.required");
    if (draft.diocese && dioceseChurches.length > 0 && !draft.church && !draft.churchOther.trim()) {
      e.church = t("errors.required");
    }
    if ((dioceses.length === 0 || draft.church === "other") && draft.church !== null && !draft.churchOther.trim()) {
      e.churchOther = t("errors.required");
    }
    if (!draft.program) e.program = t("errors.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const countryDioceses = useMemo(
    () => (options && draft.country ? options.dioceses.filter((d) => d.country_code === draft.country) : []),
    [options, draft.country],
  );
  const dioceseChurches = useMemo(
    () => (options && draft.diocese ? options.churches.filter((c) => c.diocese_id === draft.diocese) : []),
    [options, draft.diocese],
  );

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1);
    setBanner(null);
    setStep(next);
  }

  async function handleContinue() {
    if (step === 0) {
      if (!validateStep0()) return;
      goTo(1);
      return;
    }
    if (!validateStep1()) return;
    setSubmitState("loading");
    setBanner(null);
    const email = draft.email.trim().toLowerCase();
    try {
      await register({
        email,
        password,
        first_name_ar: draft.firstNameAr.trim(),
        last_name_ar: draft.lastNameAr.trim(),
        full_name_en: draft.fullNameEn.trim(),
        phone: normalizePhone(draft.phone),
        locale,
        terms_accepted: terms,
        country_code: draft.country ?? "",
        diocese_id: draft.diocese,
        church_id: draft.church === "other" ? null : draft.church,
        church_other_text: draft.church === "other" || !draft.church ? draft.churchOther.trim() : "",
        program_interest_id: draft.program,
      });
      setFirstNameVerified(draft.firstNameAr.trim());
      setVerifyEmailAddr(email);
      setSubmitState("idle");
      setDirection(1);
      setStage("verify");
    } catch (error) {
      setSubmitState("idle");
      if (error instanceof ApiError && error.code === "email_taken") {
        setErrors({ email: t("errors.emailTaken") });
        goTo(0);
        return;
      }
      if (error instanceof ApiError && error.code === "validation_error") {
        setBanner(t("errors.validation"));
        return;
      }
      setBanner(error instanceof ApiError ? error.localized(locale) : t("errors.network"));
    }
  }

  if (stage === "success") {
    return (
      <div className="flex flex-col items-center gap-6 text-center" role="status">
        <SuccessCheck />
        <div>
          <h2 className="font-display text-[28px] font-bold leading-9 text-brown-900">
            {t("success.title")}
          </h2>
          <p className="mt-2 font-serif text-[17px] font-light leading-7 text-brown-400">
            {t("success.line", { name: firstNameVerified || "" })}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <SubmitButton type="button" onClick={() => router.push("/portal")}>
            {t("success.portal")}
          </SubmitButton>
        </div>
      </div>
    );
  }

  if (stage === "verify") {
    return (
      <VerifyEmailStep
        email={verifyEmailAddr}
        autoResend={!!initialVerifyEmail}
        onVerified={() => {
          try {
            sessionStorage.removeItem(DRAFT_KEY);
          } catch {
            /* ignore */
          }
          setStage("success");
        }}
        onChangeEmail={
          initialVerifyEmail
            ? undefined
            : () => {
                setStage("form");
                goTo(0);
              }
        }
      />
    );
  }

  const stepFrom = direction * (locale === "ar" ? -24 : 24);

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="font-display text-[28px] font-bold leading-9 text-brown-900">
          {t("title")}
        </h1>
        <p className="mt-1 font-serif text-[17px] font-light leading-7 text-brown-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="mb-8">
        <Stepper steps={steps} current={step} />
      </div>

      {restored ? (
        <FormBanner tone="info">{t("draftRestored")}</FormBanner>
      ) : null}
      {banner ? <FormBanner tone="danger">{banner}</FormBanner> : null}

      <form
        key={step}
        className="auth-step-in flex flex-col gap-5"
        style={{ "--step-from": `${stepFrom}px` } as React.CSSProperties}
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
        noValidate
      >
        <h2
          ref={stepTitleRef}
          tabIndex={-1}
          className="font-serif text-[17px] font-bold text-brown-900 focus:outline-none"
        >
          {steps[step]}
        </h2>

        {step === 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("fields.firstNameAr")}
                value={draft.firstNameAr}
                onChange={(e) => {
                  patch({ firstNameAr: e.target.value });
                  clearError("firstNameAr");
                }}
                error={errors.firstNameAr}
                autoComplete="given-name"
              />
              <Field
                label={t("fields.lastNameAr")}
                value={draft.lastNameAr}
                onChange={(e) => {
                  patch({ lastNameAr: e.target.value });
                  clearError("lastNameAr");
                }}
                error={errors.lastNameAr}
                autoComplete="family-name"
              />
            </div>
            <Field
              label={t("fields.fullNameEn")}
              value={draft.fullNameEn}
              onChange={(e) => {
                patch({ fullNameEn: e.target.value });
                clearError("fullNameEn");
              }}
              error={errors.fullNameEn}
              hint={t("hints.fullNameEn")}
              ltr
              autoComplete="name"
            />
            <Field
              label={t("fields.email")}
              type="email"
              value={draft.email}
              onChange={(e) => {
                patch({ email: e.target.value });
                clearError("email");
                setEmailCheck("idle");
              }}
              onBlur={handleEmailBlur}
              error={errors.email}
              ltr
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              pending={emailCheck === "pending"}
              valid={emailCheck === "ok"}
            />
            {errors.email === t("errors.emailTaken") ? (
              <p className="-mt-3 font-serif text-[13px] text-brown-400">
                {t("emailTakenHint")}{" "}
                <Link href="/login" className="font-bold text-blue-500 underline-offset-4 hover:underline">
                  {t("emailTakenLogin")}
                </Link>
              </p>
            ) : null}
            <Field
              label={t("fields.phone")}
              type="tel"
              value={draft.phone}
              onChange={(e) => {
                patch({ phone: e.target.value });
                clearError("phone");
              }}
              error={errors.phone}
              hint={t("hints.phone")}
              ltr
              autoComplete="tel"
            />
            <PasswordField
              label={t("fields.password")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError("password");
              }}
              error={errors.password}
              withMeter
              emailLocalPart={emailLocalPart}
              autoComplete="new-password"
            />
            <PasswordField
              label={t("fields.confirm")}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                clearError("confirm");
              }}
              onBlur={() => {
                if (confirm && confirm !== password) {
                  setErrors((e) => ({ ...e, confirm: t("errors.confirmMismatch") }));
                }
              }}
              error={errors.confirm}
              autoComplete="new-password"
            />

            <div>
              <label className="flex cursor-pointer items-start gap-3 font-serif text-[15px] leading-relaxed text-brown-500">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => {
                    setTerms(e.target.checked);
                    clearError("terms");
                  }}
                  className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-brown-300 transition-colors checked:border-brown-500 checked:bg-brown-500 checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23fef6f0%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%206%209%2017l-5-5%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  style={{ backgroundSize: "14px" }}
                />
                <span>
                  {t.rich("consent", {
                    terms: (chunk) => (
                      <Link
                        href="/terms"
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-blue-500 underline-offset-4 hover:underline"
                      >
                        {chunk}
                      </Link>
                    ),
                    privacy: (chunk) => (
                      <Link
                        href="/privacy"
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-blue-500 underline-offset-4 hover:underline"
                      >
                        {chunk}
                      </Link>
                    ),
                  })}
                </span>
              </label>
              {errors.terms ? (
                <p className="auth-error-in mt-1.5 font-serif text-[13px] text-danger">{errors.terms}</p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <SearchableSelect
              label={t("fields.country")}
              options={COUNTRIES.map((c) => ({
                value: c.code,
                label: locale === "ar" ? c.ar : c.en,
              }))}
              value={draft.country}
              onChange={(country) => {
                // Cascade: country change resets diocese + church (spec §8).
                patch({ country, diocese: null, church: null, churchOther: "" });
                clearError("country");
              }}
              placeholder={t("placeholders.country")}
              error={errors.country}
            />
            {countryDioceses.length > 0 ? (
              <SearchableSelect
                label={t("fields.diocese")}
                options={countryDioceses.map((d) => ({
                  value: d.id,
                  label: locale === "ar" ? d.name_ar : d.name_en,
                }))}
                value={draft.diocese}
                onChange={(diocese) => {
                  patch({ diocese, church: null, churchOther: "" });
                  clearError("diocese");
                }}
                placeholder={t("placeholders.diocese")}
                error={errors.diocese}
              />
            ) : null}
            {draft.diocese && dioceseChurches.length > 0 ? (
              <SearchableSelect
                label={t("fields.church")}
                options={dioceseChurches.map((c) => ({
                  value: c.id,
                  label: locale === "ar" ? c.name_ar : c.name_en,
                  meta: c.city || undefined,
                }))}
                value={draft.church === "other" ? null : draft.church}
                onChange={(church) => {
                  patch({ church, churchOther: "" });
                  clearError("church");
                }}
                placeholder={t("placeholders.church")}
                error={errors.church}
                otherLabel={t("churchOtherAction")}
                onOther={() => {
                  patch({ church: "other" });
                  clearError("church");
                }}
              />
            ) : null}
            {(draft.country && countryDioceses.length === 0) || draft.church === "other" ? (
              <Field
                label={t("fields.churchOther")}
                value={draft.churchOther}
                onChange={(e) => {
                  patch({ churchOther: e.target.value });
                  clearError("churchOther");
                }}
                error={errors.churchOther}
                hint={t("hints.churchOther")}
              />
            ) : null}
            <SearchableSelect
              label={t("fields.program")}
              options={(options?.programs ?? []).map((p) => ({
                value: p.id,
                label: locale === "ar" ? p.name_ar : p.name_en,
              }))}
              value={draft.program}
              onChange={(program) => {
                patch({ program });
                clearError("program");
              }}
              placeholder={t("placeholders.program")}
              hint={t("hints.program")}
              error={errors.program}
              searchable={false}
            />
          </>
        )}

        <div className="mt-2 flex flex-col gap-3">
          {step === 1 ? (
            <SubmitButton type="button" variant="ghost" onClick={() => goTo(0)}>
              {tShared("wizard.back")}
            </SubmitButton>
          ) : null}
          <SubmitButton state={submitState}>
            {step === 0 ? tShared("wizard.continue") : t("createCta")}
          </SubmitButton>
        </div>
      </form>

      <p className="mt-6 text-center font-serif text-[15px] text-brown-400">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-bold text-brown-500 underline-offset-4 hover:underline">
          {t("goLogin")}
        </Link>
      </p>
    </div>
  );
}
