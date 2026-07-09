"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError, login } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Field from "./Field";
import PasswordField from "./PasswordField";
import FormBanner from "./FormBanner";
import SubmitButton from "./SubmitButton";

type Banner = { tone: "danger" | "warning" | "info"; text: string; showForgot?: boolean };

export default function LoginForm() {
  const t = useTranslations("auth.login");
  const locale = useLocale();
  const router = useRouter();
  const { setUser } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [failures, setFailures] = useState(0);
  const [capsLock, setCapsLock] = useState(false);
  const [shake, setShake] = useState(false);
  const [fieldError, setFieldError] = useState(false);

  function fail(next: Banner) {
    setBanner(next);
    setPassword("");
    setShake(true);
    setTimeout(() => setShake(false), 350);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!identifier.trim() || !password) {
      setFieldError(true);
      return;
    }
    setFieldError(false);
    setState("loading");
    try {
      const user = await login(identifier.trim().toLowerCase(), password, remember);
      setUser(user);
      setState("success");
      const home = user.user_type === "student" ? "/portal" : "/admin";
      setTimeout(() => router.push(home), 400);
    } catch (error) {
      setState("idle");
      if (!(error instanceof ApiError)) {
        fail({ tone: "danger", text: t("errors.network") });
        return;
      }
      if (error.code === "unverified") {
        // Unverified users continue to the OTP screen with a fresh code offer.
        router.push(`/register?verify=${encodeURIComponent(identifier.trim().toLowerCase())}`);
        return;
      }
      const failCount = failures + 1;
      setFailures(failCount);
      switch (error.code) {
        case "invalid_credentials":
          fail({ tone: "danger", text: t("errors.invalid"), showForgot: failCount >= 3 });
          break;
        case "suspended":
          fail({ tone: "warning", text: t("errors.suspended") });
          break;
        case "rate_limited":
          fail({ tone: "warning", text: t("errors.throttled") });
          break;
        default:
          if (error.status === 423 || error.code === "forbidden") {
            fail({ tone: "warning", text: t("errors.locked"), showForgot: true });
          } else {
            fail({ tone: "danger", text: error.localized(locale) });
          }
      }
    }
  }

  return (
    <div className={shake ? "auth-shake" : ""}>
      <div className="mb-8 text-center">
        <h1 className="font-display text-[28px] font-bold leading-9 text-brown-900">
          {t("title")}
        </h1>
        <p className="mt-1 font-serif text-[17px] font-light leading-7 text-brown-400">
          {t("subtitle")}
        </p>
      </div>

      {banner ? (
        <FormBanner tone={banner.tone}>
          {banner.text}
          {banner.showForgot ? (
            <>
              {" "}
              <Link href="/forgot-password" className="font-bold text-blue-500 underline underline-offset-4">
                {t("forgotSuggestion")}
              </Link>
            </>
          ) : null}
        </FormBanner>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <Field
          label={t("identifier")}
          name="username"
          type="text"
          ltr
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={fieldError && !identifier.trim() ? t("errors.required") : undefined}
        />
        <PasswordField
          label={t("password")}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onCapsLock={setCapsLock}
          error={fieldError && !password ? t("errors.required") : undefined}
          hint={capsLock ? t("capsLock") : undefined}
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-serif text-[15px] text-brown-500">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-5 cursor-pointer appearance-none rounded-md border-2 border-brown-300 transition-colors checked:border-brown-500 checked:bg-brown-500 checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23fef6f0%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%206%209%2017l-5-5%22/%3E%3C/svg%3E')] checked:bg-center checked:bg-no-repeat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              style={{ backgroundSize: "14px" }}
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/forgot-password"
            className="font-serif text-[15px] font-bold text-blue-500 underline-offset-4 hover:underline"
          >
            {t("forgot")}
          </Link>
        </div>

        <SubmitButton state={state}>{t("cta")}</SubmitButton>
      </form>

      <p className="mt-6 text-center font-serif text-[15px] text-brown-400">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-bold text-brown-500 underline-offset-4 hover:underline">
          {t("goRegister")}
        </Link>
      </p>
    </div>
  );
}
