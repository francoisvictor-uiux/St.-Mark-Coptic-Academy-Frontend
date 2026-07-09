"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import LogoMark from "@/components/ui/LogoMark";
import { useAuth } from "@/lib/auth-context";
import SubmitButton from "./SubmitButton";
import { SpinnerIcon } from "./icons";

/**
 * Placeholder portal home: proves the session (auth/me), greets the user,
 * offers sign-out. The real dashboard replaces this (spec Part 3).
 */
export default function PortalHome() {
  const t = useTranslations("auth.portal");
  const router = useRouter();
  const { user, status, signOut } = useAuth();

  useEffect(() => {
    if (status === "guest") router.replace("/login");
    else if (status === "authed" && user && user.user_type !== "student") router.replace("/admin");
  }, [status, user, router]);

  if (status !== "authed" || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-surface">
        <p className="flex items-center gap-3 font-serif text-[16px] text-brown-400" role="status">
          <SpinnerIcon className="size-5" />
          {t("loading")}
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-[560px] rounded-card border border-line bg-card p-8 md:p-12">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Link href="/">
            <span className="flex size-16 items-center justify-center rounded-full bg-red-500">
              <LogoMark className="size-8 text-creamy-100" />
            </span>
          </Link>
          <div>
            <h1 className="font-display text-[28px] font-bold leading-9 text-brown-900">
              {t("welcome", { name: user.first_name_ar || user.full_name_en })}
            </h1>
            <p className="mt-2 font-serif text-[16px] font-light leading-relaxed text-brown-400">
              {t("comingSoon")}
            </p>
          </div>
        </div>

        <dl className="mb-8 divide-y divide-line rounded-2xl border border-line">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="font-serif text-[15px] font-bold text-brown-500">{t("email")}</dt>
            <dd dir="ltr" className="truncate font-serif text-[15px] text-brown-900">
              {user.email}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="font-serif text-[15px] font-bold text-brown-500">{t("type")}</dt>
            <dd className="font-serif text-[15px] text-brown-900">
              {t(`types.${user.user_type}` as "types.student")}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          <SubmitButton type="button" onClick={() => router.push("/portal/profile")}>
            {t("completeProfile")}
          </SubmitButton>
          <SubmitButton
            type="button"
            variant="ghost"
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            {t("signOut")}
          </SubmitButton>
        </div>
      </div>
    </main>
  );
}
