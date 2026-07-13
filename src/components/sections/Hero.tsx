"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CopticCross from "@/components/ui/CopticCross";
import PillButton from "@/components/ui/PillButton";
import Magnetic from "@/components/ui/Magnetic";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Hero({ overrides }: { overrides?: { eyebrow?: string; title?: string; subtitle?: string; patronPrefix?: string; patron?: string; ctaPrimary?: string; ctaSecondary?: string } }) {
  const t = useTranslations("hero");
  const locale = useLocale();
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Autoplay insurance for mobile: browsers only allow it when the
        // video is muted, and some (iOS Low Power Mode, data saver) still
        // block it until the first user gesture — so kick playback
        // explicitly and retry once on first touch/click.
        const video = videoRef.current;
        const tryPlay = () => {
          if (video && video.paused) {
            video.muted = true;
            video.play().catch(() => {});
          }
        };
        tryPlay();
        window.addEventListener("touchstart", tryPlay, { once: true, passive: true });
        window.addEventListener("click", tryPlay, { once: true });

        // Hold the entrance until the preloader sheet has lifted away.
        const preloading = document.querySelector("[data-preloader]") !== null;

        const entrance = gsap
          .timeline({ defaults: { ease: "power3.out" }, paused: preloading })
          .from("[data-hero-eyebrow]", { autoAlpha: 0, y: 24, duration: 0.7 })
          .from(
            "[data-hero-title]",
            { autoAlpha: 0, y: 40, scale: 0.98, duration: 1.1 },
            "-=0.35",
          )
          .from("[data-hero-subtitle]", { autoAlpha: 0, y: 24, duration: 0.8 }, "-=0.6")
          .from("[data-hero-cta]", { autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.12 }, "-=0.5")
          // Gentle zoom-settle (transform only — still no opacity, which was
          // the original jank). Deliberately NOT a vertical slide: the video is
          // tucked under the headline with a big negative margin, so a yPercent
          // rise made its top edge lift up and clip. A centred scale settles it
          // into place without any vertical shift.
          .from(
            "[data-hero-image]",
            { scale: 1.06, duration: 1.1, ease: "power2.out", transformOrigin: "50% 50%" },
            "-=0.55",
          );

        const startEntrance = () => entrance.play();
        if (preloading) {
          window.addEventListener("preloader:done", startEntrance, { once: true });
        }

        return () => {
          window.removeEventListener("preloader:done", startEntrance);
          window.removeEventListener("touchstart", tryPlay);
          window.removeEventListener("click", tryPlay);
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        videoRef.current?.pause();
      });

      // Smooth scroll-linked parallax between the hero and the next section.
      // Scrubbed directly by scroll input, so it stays subtle and runs for
      // everyone (kept out of the reduced-motion gate above on purpose).
      const parallax = { trigger: ref.current, start: "top top", end: "bottom top", scrub: 0.8 } as const;
      // Foreground copy lifts up and dissolves ahead of the scroll…
      gsap.to("[data-hero-content]", {
        yPercent: -14,
        autoAlpha: 0.15,
        ease: "none",
        scrollTrigger: parallax,
      });
      // …while the campus film lags behind and drifts, creating depth.
      gsap.to("[data-hero-image] video", {
        yPercent: 14,
        scale: 1.08,
        ease: "none",
        immediateRender: false, // never apply the drifted end-state before scroll
        scrollTrigger: parallax,
      });
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id="top"
      aria-labelledby="hero-title"
      className="relative flex min-h-svh flex-col overflow-hidden bg-creamy-100 pt-[112px] md:pt-[140px]"
    >
      {/* Content */}
      <div data-hero-content className="relative z-10 mx-auto flex w-full max-w-[820px] flex-col items-center gap-8 px-4 text-center md:gap-10">
        <div className="flex flex-col items-center gap-8 md:gap-10">
          <div data-hero-eyebrow className="flex items-center justify-center gap-2">
            <CopticCross className="size-5 text-brown-500" />
            <p className="font-serif text-[15px] text-brown-500 [font-feature-settings:'swsh'_1] md:text-lg">
              {overrides?.eyebrow ?? t("eyebrow")}
            </p>
          </div>

          <h1
            id="hero-title"
            data-hero-title
            className={`text-balance text-brown-500 ${
              locale === "ar"
                ? "font-thulth text-[clamp(52px,10vw,120px)] leading-[0.95]"
                : "font-display text-[clamp(44px,7.5vw,96px)] font-bold leading-[1.02]"
            }`}
          >
            {overrides?.title ?? t("title")}
          </h1>

          <p
            data-hero-subtitle
            className="max-w-[712px] text-pretty font-serif text-[17px] leading-[1.7] text-brown-300 md:text-xl md:leading-[30px]"
          >
            {overrides?.subtitle ?? t("subtitle")}
            <br className="hidden md:block" /> {overrides?.patronPrefix ?? t("patronPrefix")}{" "}
            <strong className="font-black text-brown-500">{overrides?.patron ?? t("patron")}</strong>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <span data-hero-cta>
            <PillButton href="#programs" variant="primary" withArrow>
              {overrides?.ctaPrimary ?? t("ctaPrimary")}
            </PillButton>
          </span>
          <span data-hero-cta>
            <Magnetic>
              <PillButton href="#apply" variant="outlinePink">
                {overrides?.ctaSecondary ?? t("ctaSecondary")}
              </PillButton>
            </Magnetic>
          </span>
        </div>
      </div>

      {/* Campus film, pulled up under the CTAs and blended into the cream sky */}
      <div
        data-hero-image
        className="relative -mt-32 h-[440px] w-full [will-change:transform] sm:-mt-48 sm:h-[580px] md:-mt-72 md:h-[800px] lg:-mt-88 lg:h-[920px]"
      >
        <video
          ref={videoRef}
          src="/videos/hero.mp4"
          poster="/videos/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={t("imageAlt")}
          className="absolute inset-0 size-full object-cover [will-change:transform] [transform:translateZ(0)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-creamy-100 from-[50%] to-creamy-100/0"
        />
      </div>
    </section>
  );
}
