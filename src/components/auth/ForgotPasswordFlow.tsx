"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ApiError,
  forgotPassword,
  resendOtp,
  resetPassword,
  verifyResetCode,
} from "@/lib/api";
import Field from "./Field";
import PasswordField, { passwordScore } from "./PasswordField";
import FormBanner from "./FormBanner";
import SubmitButton from "./SubmitButton";
import OtpInput from "./OtpInput";
import SuccessCheck from "./SuccessCheck";
import { KeyIcon, ShieldIcon } from "./icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_COOLDOWN = 60;

type Stage = "request" | "code" | "password" | "done";

/** AUTH-05 → AUTH-08: request code → enter code → new password → success. */
export default function ForgotPasswordFlow() {
  const t = useTranslations("auth.forgot");
  const locale = useLocale();

  const [stage, setStage] = useState<Stage>("request");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [otpState, setOtpState] = useState<"idle" | "error" | "success">("idle");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [banner, setBanner] = useState<{ tone: "danger" | "info"; text: string; restart?: boolean } | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success">("idle");
  const [cooldown, setCooldown] = useState(0);
  const verifying = useRef(false);

  useEffect(() => {
    if (stage !== "code") return;
    setCooldown(RESEND_COOLDOWN);
    const tick = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, [stage]);

  function restart() {
    setStage("request");
    setCode("");
    setResetToken("");
    setPassword("");
    setConfirm("");
    setBanner(null);
    setOtpState("idle");
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setEmailError(t("errors.email"));
      return;
    }
    setEmailError(undefined);
    setBanner(null);
    setSubmitState("loading");
    try {
      await forgotPassword(clean);
    } catch {
      /* Neutral outcome even on throttle — never reveals account existence. */
    }
    setEmail(clean);
    setSubmitState("idle");
    setStage("code");
    setBanner({ tone: "info", text: t("neutralSent") });
  }

  async function handleCode(fullCode: string) {
    if (verifying.current) return;
    verifying.current = true;
    setBanner(null);
    setSubmitState("loading");
    try {
      const { reset_token } = await verifyResetCode(email, fullCode);
      setOtpState("success");
      setResetToken(reset_token);
      setTimeout(() => {
        setSubmitState("idle");
        setOtpState("idle");
        setStage("password");
        verifying.current = false;
      }, 600);
    } catch (error) {
      setSubmitState("idle");
      setOtpState("error");
      setCode("");
      if (error instanceof ApiError && error.code === "too_many_attempts") {
        setBanner({ tone: "danger", text: t("errors.tooManyAttempts"), restart: true });
      } else if (error instanceof ApiError && error.code === "invalid_code") {
        setBanner({ tone: "danger", text: t("errors.wrongCode") });
      } else {
        setBanner({
          tone: "danger",
          text: error instanceof ApiError ? error.localized(locale) : t("errors.network"),
        });
      }
      verifying.current = false;
    }
  }

  async function handleResend() {
    setBanner(null);
    try {
      await resendOtp(email, "password_reset");
      setCooldown(RESEND_COOLDOWN);
      setBanner({ tone: "info", text: t("resent") });
    } catch (error) {
      setBanner({
        tone: "danger",
        text:
          error instanceof ApiError && error.code === "otp_rate_limited"
            ? t("errors.resendLimit")
            : t("errors.network"),
      });
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    const errors: typeof fieldErrors = {};
    if (password.length < 10) errors.password = t("errors.passwordLength");
    else if (passwordScore(password) < 3) errors.password = t("errors.passwordWeak");
    if (confirm !== password) errors.confirm = t("errors.confirmMismatch");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setBanner(null);
    setSubmitState("loading");
    try {
      await resetPassword(resetToken, password);
      setSubmitState("success");
      setTimeout(() => setStage("done"), 400);
    } catch (error) {
      setSubmitState("idle");
      if (error instanceof ApiError && error.code === "password_reused") {
        setFieldErrors({ password: t("errors.reused") });
      } else if (error instanceof ApiError && error.code === "invalid_reset_token") {
        setBanner({ tone: "danger", text: t("errors.tokenExpired"), restart: true });
      } else {
        setBanner({
          tone: "danger",
          text: error instanceof ApiError ? error.localized(locale) : t("errors.network"),
        });
      }
    }
  }

  if (stage === "done") {
    return (
      <div className="flex flex-col items-center gap-6 text-center" role="status">
        <SuccessCheck />
        <div>
          <h1 className="font-display text-[28px] font-bold leading-9 text-brown-900">
            {t("done.title")}
          </h1>
          <p className="mt-2 font-serif text-[16px] font-light leading-relaxed text-brown-400">
            {t("done.sessionsRevoked")}
          </p>
        </div>
        <SubmitButton type="button" onClick={() => (window.location.href = `/${locale}/login`)}>
          {t("done.cta")}
        </SubmitButton>
      </div>
    );
  }

  const icon =
    stage === "password" ? (
      <ShieldIcon className="size-6 text-blue-500" />
    ) : (
      <KeyIcon className="size-6 text-blue-500" />
    );
  const title = stage === "request" ? t("title") : stage === "code" ? t("codeTitle") : t("passwordTitle");
  const subtitle =
    stage === "request" ? t("subtitle") : stage === "code" ? null : t("passwordSubtitle");

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-blue-50">{icon}</span>
        <div>
          <h1 className="font-display text-[28px] font-bold leading-9 text-brown-900">{title}</h1>
          {subtitle ? (
            <p className="mt-2 font-serif text-[16px] font-light leading-relaxed text-brown-400">
              {subtitle}
            </p>
          ) : stage === "code" ? (
            <p className="mt-2 font-serif text-[16px] font-light leading-relaxed text-brown-400">
              {t("codeSubtitle")}{" "}
              <bdi dir="ltr" className="font-bold text-brown-900">
                {email}
              </bdi>
            </p>
          ) : null}
        </div>
      </div>

      {banner ? (
        <FormBanner tone={banner.tone}>
          {banner.text}
          {banner.restart ? (
            <>
              {" "}
              <button
                type="button"
                onClick={restart}
                className="font-bold text-blue-500 underline underline-offset-4"
              >
                {t("startOver")}
              </button>
            </>
          ) : null}
        </FormBanner>
      ) : null}

      {stage === "request" ? (
        <form className="flex flex-col gap-5" onSubmit={handleRequest} noValidate>
          <Field
            label={t("emailLabel")}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(undefined);
            }}
            error={emailError}
            ltr
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <SubmitButton state={submitState === "success" ? "idle" : submitState}>
            {t("cta")}
          </SubmitButton>
        </form>
      ) : null}

      {stage === "code" ? (
        <div>
          <OtpInput
            label={t("codeLabel")}
            value={code}
            onChange={(next) => {
              setCode(next);
              if (otpState === "error") setOtpState("idle");
            }}
            onComplete={handleCode}
            state={otpState}
            disabled={submitState === "loading"}
          />
          <div className="mt-6 text-center font-serif text-[15px] text-brown-400" aria-live="polite">
            {cooldown > 0 ? (
              <span>
                {t("resendIn")}{" "}
                <bdi dir="ltr" className="font-archivo tabular-nums">
                  0:{String(cooldown).padStart(2, "0")}
                </bdi>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-brown-500 underline-offset-4 hover:underline"
              >
                {t("resend")}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {stage === "password" ? (
        <form className="flex flex-col gap-5" onSubmit={handleReset} noValidate>
          <PasswordField
            label={t("newPassword")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            error={fieldErrors.password}
            withMeter
            autoComplete="new-password"
          />
          <PasswordField
            label={t("confirmPassword")}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setFieldErrors((f) => ({ ...f, confirm: undefined }));
            }}
            error={fieldErrors.confirm}
            autoComplete="new-password"
          />
          <SubmitButton state={submitState}>{t("resetCta")}</SubmitButton>
        </form>
      ) : null}

      <p className="mt-6 text-center font-serif text-[15px] text-brown-400">
        <Link href="/login" className="font-bold text-brown-500 underline-offset-4 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
