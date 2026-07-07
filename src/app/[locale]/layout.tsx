import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Preloader from "@/components/layout/Preloader";
import {
  thmanyahSans,
  thmanyahSerifText,
  thmanyahSerifDisplay,
  moshrefThulth,
  archivo,
} from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${thmanyahSans.variable} ${thmanyahSerifText.variable} ${thmanyahSerifDisplay.variable} ${moshrefThulth.variable} ${archivo.variable}`}
    >
      <body className="min-h-screen">
        <NextIntlClientProvider>
          <Preloader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
