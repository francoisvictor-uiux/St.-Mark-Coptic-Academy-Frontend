"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import { acceptInvite } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth-context";
import PasswordField, { passwordScore } from "./PasswordField";
import FormBanner from "./FormBanner";
import SubmitButton from "./SubmitButton";
import { ShieldIcon } from "./icons";

/** Invited admin sets their password (journey §3.2 — 72h link). */
export default function AcceptInviteForm({ token }: { token: string }) {
  const t = useTranslations("auth.acceptInvite");
  const locale = useLocale();
  const router = useRouter();
  const { setUser } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [banner, setBanner] = useState<{ tone: "danger"; text: string; expired?: boolean } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (password.length < 10) next.password = t("errors.passwordLength");
    else if (passwordScore(password) < 3) next.password = t("errors.passwordWeak");
    if (confirm !== password) next.confirm = t("errors.confirmMismatch");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBanner(null);
    setState("loading");
    try {
      const user = await acceptInvite(token, password);
      setUser(user);
      setState("success");
      setTimeout(() => router.push(user.user_type === "student" ? "/portal" : "/admin"), 500);
    } catch (error) {
      setState("idle");
      if (error instanceof ApiError && error.code === "invalid_invite") {
        setBanner({ tone: "danger", text: t("errors.expired"), expired: true });
      } else {
        setBanner({
          tone: "danger",
          text: error instanceof ApiError ? error.localized(locale) : t("errors.network"),
        });
      }
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="font-serif text-[16px] text-brown-400">{t("missingToken")}</p>
        <Link href="/login" className="mt-4 inline-block font-serif text-[15px] font-bold text-blue-500 underline-offset-4 hover:underline">
          {t("goLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-blue-50">
          <ShieldIcon className="size-6 text-blue-500" />
        </span>
        <div>
          <h1 className="font-display text-[28px] font-bold leading-9 text-brown-900">{t("title")}</h1>
          <p className="mt-2 font-serif text-[16px] font-light leading-relaxed text-brown-400">{t("subtitle")}</p>
        </div>
      </div>

      {banner ? (
        <FormBanner tone={banner.tone}>
          {banner.text}
          {banner.expired ? (
            <>
              {" "}
              <span className="text-brown-500">{t("askNewInvite")}</span>
            </>
          ) : null}
        </FormBanner>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <PasswordField
          label={t("password")}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          withMeter
          autoComplete="new-password"
        />
        <PasswordField
          label={t("confirm")}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setErrors((prev) => ({ ...prev, confirm: undefined }));
          }}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <SubmitButton state={state}>{t("cta")}</SubmitButton>
      </form>
    </div>
  );
}
