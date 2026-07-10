"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Real pages route to their dedicated route; homepage-only sections (About,
// FAQ) route to the home page anchor so they work from any page.
const NAV_ITEMS = [
  { key: "about", href: "/about" },
  { key: "programs", href: "/programs" },
  { key: "theses", href: "/theses" },
  { key: "articles", href: "/articles" },
  { key: "events", href: "/events" },
  { key: "faq", href: "/#faq" },
] as const;

// Highlight the current page. Home-anchor items (path "/") are skipped since
// the home page hosts several of them.
function useIsActive(pathname: string) {
  return (href: string) => {
    const path = href.split("#")[0].replace(/\/+$/, "") || "/";
    if (path === "/") return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };
}

export default function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const isActive = useIsActive(pathname);
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useGSAP(
    () => {
      const el = headerRef.current;
      if (!el) return;

      // Solidify the bar once the page starts scrolling.
      ScrollTrigger.create({
        start: 60,
        onEnter: () => el.setAttribute("data-scrolled", "true"),
        onLeaveBack: () => el.removeAttribute("data-scrolled"),
      });

      // Hide on scroll down, reveal on scroll up.
      const show = gsap
        .from(el, { yPercent: -110, duration: 0.35, ease: "power2.out", paused: true })
        .progress(1);

      ScrollTrigger.create({
        start: 200,
        end: "max",
        onUpdate: (self) => {
          if (self.direction === 1) {
            show.reverse();
          } else {
            show.play();
          }
        },
      });
    },
    { scope: headerRef },
  );

  const otherLocale = locale === "ar" ? "en" : "ar";

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      ref={headerRef}
      className="group/header fixed inset-x-0 top-0 z-50 border-b border-transparent bg-transparent transition-all duration-300 data-scrolled:border-line/60 data-scrolled:bg-creamy-100/90 data-scrolled:shadow-[0_1px_0_0_rgba(86,40,35,0.04)] data-scrolled:backdrop-blur-md"
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 md:h-[84px] md:px-8">
        {/* Logo — routes to the home page from any page */}
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={t("home")}>
          <Image src="/Logo.svg" alt="" width={48} height={48} className="size-10 md:size-12" priority />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              data-active={isActive(item.href) ? "true" : undefined}
              className="font-serif text-[16px] text-brown-400 transition-colors hover:text-brown-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brown-500 data-active:font-bold data-active:text-brown-500"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Search */}
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(`/theses${q ? `?q=${encodeURIComponent(String(q))}` : ""}`);
            }}
            className="hidden items-center md:flex"
          >
            {searchOpen ? (
              <input
                name="q"
                type="search"
                autoFocus
                placeholder={t("searchPlaceholder")}
                onBlur={(e) => {
                  if (!e.currentTarget.value) setSearchOpen(false);
                }}
                className="h-10 w-56 rounded-full border border-line bg-card px-4 font-serif text-sm text-brown-900 placeholder:text-brown-200 focus:border-brown-400 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={t("search")}
                className="flex size-10 items-center justify-center rounded-full text-brown-400 transition-colors hover:bg-brown-500/5 hover:text-brown-500"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            )}
          </form>

          {/* Language switcher */}
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: otherLocale })}
            className="flex h-10 items-center rounded-full border border-line px-3.5 font-sans text-sm font-medium text-brown-400 transition-colors hover:border-brown-400 hover:text-brown-500"
            aria-label={t("switchLocale")}
          >
            {t("switchLocale")}
          </button>

          {/* Auth */}
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-full border border-brown-500 px-4 font-serif text-[15px] font-bold text-brown-500 transition-colors hover:bg-brown-500/5 md:flex"
          >
            {t("login")}
          </Link>
          <Link
            href="/register"
            className="hidden h-10 items-center rounded-full bg-brown-500 px-5 font-serif text-[15px] font-bold text-creamy-50 transition-colors hover:bg-brown-600 md:flex"
          >
            {t("register")}
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t("menuClose") : t("menuOpen")}
            className="flex size-10 items-center justify-center rounded-full text-brown-500 transition-colors hover:bg-brown-500/5 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-6" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen ? (
        <div
          id="mobile-menu"
          className="border-t border-line/60 bg-creamy-100/95 backdrop-blur-md lg:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1 px-4 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={closeMenu}
                aria-current={isActive(item.href) ? "page" : undefined}
                data-active={isActive(item.href) ? "true" : undefined}
                className="rounded-2xl px-4 py-3 font-serif text-lg text-brown-500 transition-colors hover:bg-brown-500/5 data-active:bg-brown-500/10 data-active:font-bold"
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="mt-3 flex gap-2 border-t border-line/60 pt-4">
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex h-12 flex-1 items-center justify-center rounded-full border border-brown-500 font-serif font-bold text-brown-500"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-brown-500 font-serif font-bold text-creamy-50"
              >
                {t("register")}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
