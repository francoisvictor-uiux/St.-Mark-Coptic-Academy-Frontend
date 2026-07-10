import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LogoMark from "@/components/ui/LogoMark";

// Dedicated pages route to their route; homepage-only sections route to the
// home page anchor so every link works from any page.
const QUICK_LINKS = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "features", href: "/#features" },
  { key: "programs", href: "/programs" },
  { key: "campus", href: "/#vision" },
  { key: "articles", href: "/articles" },
  { key: "contact", href: "/#apply" },
] as const;

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer id="contact" className="bg-brown-500 text-creamy-100">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 py-16 md:px-12 md:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-end lg:gap-16">
          {/* Identity + links */}
          <div className="flex flex-col gap-8">
            <LogoMark className="size-[72px] text-creamy-100 md:size-[100px]" />

            <div className="flex flex-col gap-1 font-serif text-[16px] leading-relaxed">
              <p>{t("address")}</p>
              <a
                href={`mailto:${t("email")}`}
                dir="ltr"
                className="w-fit underline-offset-4 transition-colors hover:text-red-200 hover:underline"
              >
                {t("email")}
              </a>
            </div>

            <nav aria-label={t("quickLinksHeading")} className="flex flex-col gap-4">
              <h3 className="font-serif text-[16px] font-bold">{t("quickLinksHeading")}</h3>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {QUICK_LINKS.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      className="font-serif text-[16px] font-light text-creamy-100/90 transition-colors hover:text-creamy-50 md:text-[18.4px]"
                    >
                      {t(`links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Newsletter */}
            <form
              className="flex max-w-md flex-col gap-3"
              aria-label={t("newsletterHeading")}
              action="#"
            >
              <h3 className="font-serif text-[16px] font-bold">{t("newsletterHeading")}</h3>
              <p className="font-serif text-sm font-light text-creamy-100/70">{t("newsletterHint")}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  name="newsletter-email"
                  required
                  placeholder={t("newsletterPlaceholder")}
                  aria-label={t("newsletterPlaceholder")}
                  className="h-12 flex-1 rounded-full border border-creamy-100/25 bg-creamy-100/10 px-5 font-serif text-[15px] text-creamy-50 placeholder:text-creamy-100/40 focus:border-creamy-100/60 focus:outline-none"
                />
                <button
                  type="submit"
                  className="h-12 shrink-0 rounded-full bg-creamy-100 px-6 font-serif text-[15px] font-bold text-brown-500 transition-colors hover:bg-creamy-300"
                >
                  {t("newsletterCta")}
                </button>
              </div>
            </form>
          </div>

          {/* Address + map */}
          <div className="flex flex-col gap-5">
            <h3 className="font-serif text-2xl font-bold">{t("addressHeading")}</h3>
            <p className="font-serif text-[18.4px] font-light leading-[1.85] text-creamy-100/90">
              {t("address")}
            </p>
            <div className="overflow-hidden rounded-map border border-creamy-100/15">
              <iframe
                title={t("mapTitle")}
                src="https://maps.google.com/maps?q=Monastery%20of%20Saint%20Pishoy%20Wadi%20El%20Natrun&z=12&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[260px] w-full border-0 md:h-[300px]"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-creamy-100/25" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="font-serif text-[15px] text-creamy-100/80 md:text-[16px]">{t("copyright")}</p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="font-serif text-[15px] text-creamy-100/70 transition-colors hover:text-creamy-50"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/terms"
              className="font-serif text-[15px] text-creamy-100/70 transition-colors hover:text-creamy-50"
            >
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
