"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LogoMark from "@/components/ui/LogoMark";

type AuthShellProps = {
  children: React.ReactNode;
  /** Wizard screens get the wider 560px column. */
  wide?: boolean;
  /** Split layout shows the campus brand pane on desktop (login only). */
  withBrandPane?: boolean;
};

/**
 * Auth screen chrome (spec AUTH-01 §4): split view ≥1024, centered card on
 * tablet, full-bleed sheet on mobile. Brand pane is decorative.
 */
export default function AuthShell({ children, wide, withBrandPane }: AuthShellProps) {
  const t = useTranslations("auth.shell");
  const locale = useLocale();
  const pathname = usePathname();
  const otherLocale = locale === "ar" ? "en" : "ar";

  const formPane = (
    <div className="relative flex min-h-svh flex-col items-center px-4 pb-16 pt-10 sm:justify-center sm:px-6 sm:py-16">
      <Link
        href={pathname}
        locale={otherLocale}
        className="absolute end-4 top-4 rounded-full border border-line px-4 py-2 font-serif text-[14px] font-bold text-brown-400 transition-colors hover:border-brown-400 hover:text-brown-500 sm:end-6 sm:top-6"
        aria-label={otherLocale === "ar" ? "العربية" : "English"}
      >
        {otherLocale === "ar" ? "ع" : "EN"}
      </Link>

      <div
        className={`w-full ${wide ? "max-w-[560px]" : "max-w-[440px]"} border-line bg-card sm:rounded-card sm:border sm:p-10 md:p-12`}
      >
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Link href="/" aria-label={t("backHome")}>
            <span className="flex size-16 items-center justify-center rounded-full bg-red-500 transition-transform hover:scale-105">
              <LogoMark className="size-8 text-creamy-100" />
            </span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );

  if (!withBrandPane) {
    return <main className="min-h-svh bg-surface">{formPane}</main>;
  }

  return (
    <main className="min-h-svh bg-surface lg:grid lg:grid-cols-12">
      <div className="lg:col-span-5 lg:min-w-[480px]">{formPane}</div>
      <div className="relative hidden overflow-hidden lg:col-span-7 lg:block" aria-hidden="true">
        <Image
          src="/images/campus.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 58vw, 0vw"
          className="object-cover"
          priority={false}
        />
        <div className="absolute inset-0 bg-brown-900/60" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "url(/Pattern.svg)", backgroundSize: "480px" }}
        />
        <figure className="absolute inset-x-0 bottom-0 p-14">
          <blockquote className="max-w-[520px] font-display text-[40px] font-bold leading-[48px] text-creamy-100">
            {t("brandQuote")}
          </blockquote>
          <figcaption className="mt-4 font-serif text-[16px] font-light text-creamy-600">
            {t("brandCaption")}
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
