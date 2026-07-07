"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import CopticCross from "@/components/ui/CopticCross";
import PillButton from "@/components/ui/PillButton";

type AuthCardProps = {
  mode: "login" | "register";
};

const inputClasses =
  "h-14 w-full rounded-2xl border border-line bg-creamy-50 px-5 font-serif text-[16px] text-brown-900 placeholder:text-brown-100 transition-colors focus:border-brown-400 focus:outline-none";

/** Auth UI shell — the student portal backend ships with the full platform. */
export default function AuthCard({ mode }: AuthCardProps) {
  const t = useTranslations("auth");
  const [submitted, setSubmitted] = useState(false);
  const isLogin = mode === "login";

  return (
    <main className="flex min-h-svh items-center justify-center bg-creamy-100 px-4 py-24">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-8 md:p-10">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-red-500">
            <CopticCross className="size-8 text-creamy-100" />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-bold text-brown-900">
              {isLogin ? t("loginTitle") : t("registerTitle")}
            </h1>
            <p className="mt-1 font-serif text-[15px] font-light text-brown-400">
              {isLogin ? t("loginSubtitle") : t("registerSubtitle")}
            </p>
          </div>
        </div>

        {submitted ? (
          <p role="status" className="rounded-2xl bg-creamy-300 p-5 text-center font-serif text-[15px] leading-[1.8] text-brown-500">
            {t("comingSoon")}
          </p>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            {!isLogin ? (
              <>
                <div>
                  <label htmlFor="accountType" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                    {t("accountType")}
                  </label>
                  <select id="accountType" name="accountType" className={`${inputClasses} appearance-none`}>
                    <option value="student">{t("accountTypes.student")}</option>
                    <option value="member">{t("accountTypes.member")}</option>
                    <option value="organization">{t("accountTypes.organization")}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="auth-name" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                    {t("fullName")}
                  </label>
                  <input id="auth-name" name="fullName" type="text" autoComplete="name" required className={inputClasses} />
                </div>
              </>
            ) : null}

            <div>
              <label htmlFor="auth-email" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                {t("email")}
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                className={`${inputClasses} text-start`}
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="mb-2 block font-serif text-[15px] font-bold text-brown-500">
                {t("password")}
              </label>
              <input
                id="auth-password"
                name="password"
                type="password"
                dir="ltr"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                className={`${inputClasses} text-start`}
              />
            </div>

            <PillButton type="submit" variant="primary" className="mt-2 w-full">
              {isLogin ? t("loginCta") : t("registerCta")}
            </PillButton>
          </form>
        )}

        <p className="mt-6 text-center font-serif text-[15px] text-brown-400">
          {isLogin ? t("noAccount") : t("haveAccount")}{" "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-bold text-brown-500 underline-offset-4 hover:underline"
          >
            {isLogin ? t("goRegister") : t("goLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
