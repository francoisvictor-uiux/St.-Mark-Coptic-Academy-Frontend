"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import SectionHeader from "@/components/ui/SectionHeader";
import CopticCross from "@/components/ui/CopticCross";
import PillButton from "@/components/ui/PillButton";
import Reveal from "@/components/ui/Reveal";

type FieldName = "fullName" | "email" | "phone" | "program" | "qualification";
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-()]{6,}$/;

export default function ApplyForm() {
  const t = useTranslations("apply");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const sectionRef = useRef<HTMLElement>(null);
  const { contextSafe } = useGSAP({ scope: sectionRef });

  const validate = (form: HTMLFormElement): Errors => {
    const data = new FormData(form);
    const next: Errors = {};
    if (!String(data.get("fullName") ?? "").trim()) next.fullName = t("validation.fullNameRequired");
    const email = String(data.get("email") ?? "").trim();
    if (!email) next.email = t("validation.emailRequired");
    else if (!EMAIL_RE.test(email)) next.email = t("validation.emailInvalid");
    const phone = String(data.get("phone") ?? "").trim();
    if (!phone) next.phone = t("validation.phoneRequired");
    else if (!PHONE_RE.test(phone)) next.phone = t("validation.phoneInvalid");
    if (!String(data.get("program") ?? "")) next.program = t("validation.programRequired");
    if (!String(data.get("qualification") ?? "").trim())
      next.qualification = t("validation.qualificationRequired");
    return next;
  };

  const animateSwap = contextSafe(() => {
    gsap.fromTo(
      "[data-apply-panel]",
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" },
    );
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = form.querySelector<HTMLElement>("[aria-invalid='true']");
      firstInvalid?.focus();
      return;
    }

    setStatus("submitting");
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
      animateSwap();
    } catch {
      setStatus("error");
    }
  };

  const fieldClasses = (name: FieldName) =>
    `h-14 w-full rounded-2xl border bg-creamy-50 px-5 font-serif text-[16px] text-brown-900 placeholder:text-brown-100 transition-colors focus:outline-none focus:border-brown-400 ${
      errors[name] ? "border-red-600" : "border-line"
    }`;

  const errorText = (name: FieldName) =>
    errors[name] ? (
      <p id={`${name}-error`} role="alert" className="mt-1.5 font-serif text-sm text-red-700">
        {errors[name]}
      </p>
    ) : null;

  return (
    <section
      ref={sectionRef}
      id="apply"
      aria-labelledby="apply-label"
      className="bg-creamy-100 py-16 md:py-24"
    >
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={t("label")} subtitle={t("subtitle")} />

        <div className="mx-auto w-full max-w-[820px]" data-reveal>
          <div
            data-apply-panel
            className="rounded-card border border-line bg-card p-6 md:p-12"
          >
            {status === "success" ? (
              <div className="flex flex-col items-center gap-6 py-10 text-center">
                <span className="flex size-[90px] items-center justify-center rounded-full bg-red-500">
                  <CopticCross className="size-11 text-creamy-100" />
                </span>
                <h3 className="font-serif text-2xl font-bold text-brown-900 md:text-3xl">
                  {t("successTitle")}
                </h3>
                <p className="max-w-md font-serif text-[16px] font-light leading-[1.8] text-brown-400">
                  {t("successBody")}
                </p>
                <PillButton
                  variant="outline"
                  onClick={() => {
                    setStatus("idle");
                    setErrors({});
                    animateSwap();
                  }}
                >
                  {t("successCta")}
                </PillButton>
              </div>
            ) : (
              <>
                <p className="mb-8 text-center font-serif text-[16px] font-light text-brown-400">
                  {t("intro")}
                </p>
                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />

                  <div>
                    <label htmlFor="fullName" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                      {t("fields.fullName")}
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder={t("fields.fullNamePlaceholder")}
                      aria-invalid={errors.fullName ? "true" : undefined}
                      aria-describedby={errors.fullName ? "fullName-error" : undefined}
                      className={fieldClasses("fullName")}
                    />
                    {errorText("fullName")}
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="email" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                        {t("fields.email")}
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        placeholder={t("fields.emailPlaceholder")}
                        aria-invalid={errors.email ? "true" : undefined}
                        aria-describedby={errors.email ? "email-error" : undefined}
                        className={`${fieldClasses("email")} text-start`}
                      />
                      {errorText("email")}
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                        {t("fields.phone")}
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        dir="ltr"
                        autoComplete="tel"
                        placeholder={t("fields.phonePlaceholder")}
                        aria-invalid={errors.phone ? "true" : undefined}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                        className={`${fieldClasses("phone")} text-start`}
                      />
                      {errorText("phone")}
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="program" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                        {t("fields.program")}
                      </label>
                      <select
                        id="program"
                        name="program"
                        defaultValue=""
                        aria-invalid={errors.program ? "true" : undefined}
                        aria-describedby={errors.program ? "program-error" : undefined}
                        className={`${fieldClasses("program")} appearance-none`}
                      >
                        <option value="" disabled>
                          {t("fields.programPlaceholder")}
                        </option>
                        <option value="masters">{t("fields.programOptions.masters")}</option>
                        <option value="doctorate">{t("fields.programOptions.doctorate")}</option>
                        <option value="diploma">{t("fields.programOptions.diploma")}</option>
                        <option value="certificate">{t("fields.programOptions.certificate")}</option>
                      </select>
                      {errorText("program")}
                    </div>
                    <div>
                      <label htmlFor="qualification" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                        {t("fields.qualification")}
                      </label>
                      <input
                        id="qualification"
                        name="qualification"
                        type="text"
                        placeholder={t("fields.qualificationPlaceholder")}
                        aria-invalid={errors.qualification ? "true" : undefined}
                        aria-describedby={errors.qualification ? "qualification-error" : undefined}
                        className={fieldClasses("qualification")}
                      />
                      {errorText("qualification")}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                      {t("fields.message")}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      placeholder={t("fields.messagePlaceholder")}
                      className="w-full rounded-2xl border border-line bg-creamy-50 p-5 font-serif text-[16px] text-brown-900 transition-colors placeholder:text-brown-100 focus:border-brown-400 focus:outline-none"
                    />
                  </div>

                  {status === "error" ? (
                    <div role="alert" className="rounded-2xl bg-red-50 p-4 text-center">
                      <p className="font-serif text-[15px] font-bold text-red-800">{t("errorTitle")}</p>
                      <p className="mt-1 font-serif text-sm text-red-700">{t("errorBody")}</p>
                    </div>
                  ) : null}

                  <div className="mt-2 flex justify-center">
                    <PillButton type="submit" variant="primary" withArrow disabled={status === "submitting"}>
                      {status === "submitting" ? t("submitting") : t("submit")}
                    </PillButton>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
