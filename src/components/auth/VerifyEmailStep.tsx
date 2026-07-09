"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ApiError, resendOtp, verifyEmail } from "@/lib/api";
import type { ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import OtpInput from "./OtpInput";
import FormBanner from "./FormBanner";
import SubmitButton from "./SubmitButton";
import { MailIcon } from "./icons";

const RESEND_COOLDOWN = 60;

type VerifyEmailStepProps = {
  email: string;
  /** Arriving from login with an unverified account → send a code immediately. */
  autoResend?: boolean;
  onVerified: (user: ApiUser) => void;
  onChangeEmail?: () => void;
};

/** AUTH-03 — OTP boxes, resend countdown, spam hint after 30s. */
export default function VerifyEmailStep({
  email,
  autoResend,
  onVerified,
  onChangeEmail,
}: VerifyEmailStepProps) {
  const t = useTranslations("auth.verify");
  const locale = useLocale();
  const { setUser } = useAuth();

  const [code, setCode] = useState("");
  const [otpState, setOtpState] = useState<"idle" | "error" | "success">("idle");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success">("idle");
  const [banner, setBanner] = useState<{ tone: "danger" | "info"; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(autoResend ? 0 : RESEND_COOLDOWN);
  const [spamHint, setSpamHint] = useState(false);
  const autoSent = useRef(false);
  const verifying = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    const spam = setTimeout(() => setSpamHint(true), 30_000);
    return () => {
      clearInterval(tick);
      clearTimeout(spam);
    };
  }, []);

  const handleResend = useCallback(async () => {
    setBanner(null);
    try {
      await resendOtp(email, "email_verify");
      setCooldown(RESEND_COOLDOWN);
      setBanner({ tone: "info", text: t("resent") });
    } catch (error) {
      setBanner({
        tone: "danger",
        text:
          error instanceof ApiError && error.code === "otp_rate_limited"
            ? t("resendLimit")
            : error instanceof ApiError
              ? error.localized(locale)
              : t("network"),
      });
    }
  }, [email, locale, t]);

  useEffect(() => {
    if (autoResend && !autoSent.current) {
      autoSent.current = true;
      setCooldown(RESEND_COOLDOWN);
      resendOtp(email, "email_verify").catch(() => {
        /* rate-limited is fine — a valid code may already be in the inbox */
      });
    }
  }, [autoResend, email]);

  async function submit(fullCode: string) {
    if (verifying.current) return;
    verifying.current = true;
    setBanner(null);
    setSubmitState("loading");
    try {
      const user = await verifyEmail(email, fullCode);
      setOtpState("success");
      setSubmitState("success");
      setUser(user);
      setTimeout(() => onVerified(user), 600);
    } catch (error) {
      setSubmitState("idle");
      setOtpState("error");
      setCode("");
      setBanner({
        tone: "danger",
        text:
          error instanceof ApiError
            ? error.code === "too_many_attempts"
              ? t("tooManyAttempts")
              : error.code === "invalid_code"
                ? t("wrongCode")
                : error.localized(locale)
            : t("network"),
      });
      verifying.current = false;
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-blue-50">
          <MailIcon className="size-6 text-blue-500" />
        </span>
        <div>
          <h2 className="font-display text-[28px] font-bold leading-9 text-brown-900">
            {t("title")}
          </h2>
          <p className="mt-2 font-serif text-[16px] font-light leading-relaxed text-brown-400">
            {t("sentTo")}{" "}
            <bdi dir="ltr" className="font-bold text-brown-900">
              {email}
            </bdi>
            {onChangeEmail ? (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onChangeEmail}
                  className="font-bold text-blue-500 underline-offset-4 hover:underline"
                >
                  {t("changeEmail")}
                </button>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {banner ? <FormBanner tone={banner.tone}>{banner.text}</FormBanner> : null}

      <OtpInput
        label={t("codeLabel")}
        value={code}
        onChange={(next) => {
          setCode(next);
          if (otpState === "error") setOtpState("idle");
        }}
        onComplete={submit}
        state={otpState}
        disabled={submitState !== "idle"}
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
        {spamHint ? <p className="mt-2 text-[13px] text-brown-300">{t("spamHint")}</p> : null}
      </div>

      <SubmitButton
        type="button"
        state={submitState}
        onClick={() => code.length === 6 && submit(code)}
        className="mt-8"
      >
        {t("cta")}
      </SubmitButton>
    </div>
  );
}
