"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CopticCross from "@/components/ui/CopticCross";
import PillButton from "@/components/ui/PillButton";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function Hero() {
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
          .from(
            "[data-hero-image]",
            { autoAlpha: 0, y: 80, duration: 1.2, ease: "power2.out" },
            "-=0.6",
          );

        const startEntrance = () => entrance.play();
        if (preloading) {
          window.addEventListener("preloader:done", startEntrance, { once: true });
        }

        // Gentle parallax on the campus video while scrolling away.
        gsap.to("[data-hero-image] video", {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        // Pattern band drifts slightly slower than the scroll.
        gsap.to("[data-hero-pattern]", {
          yPercent: -14,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });

        return () => {
          window.removeEventListener("preloader:done", startEntrance);
          window.removeEventListener("touchstart", tryPlay);
          window.removeEventListener("click", tryPlay);
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        videoRef.current?.pause();
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
      {/* Decorative motif band behind the campus image (Figma hero pattern) */}
      <div
        data-hero-pattern
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[38%] h-[430px] opacity-[0.05] [background-image:url('/Pattern.svg')] [background-size:374px_212px] [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-[820px] flex-col items-center gap-8 px-4 text-center md:gap-10">
        <div className="flex flex-col items-center gap-8 md:gap-10">
          <div data-hero-eyebrow className="flex items-center justify-center gap-2">
            <CopticCross className="size-5 text-brown-500" />
            <p className="font-serif text-[15px] text-brown-500 [font-feature-settings:'swsh'_1] md:text-lg">
              {t("eyebrow")}
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
            {t("title")}
          </h1>

          <p
            data-hero-subtitle
            className="max-w-[712px] text-pretty font-serif text-[17px] leading-[1.7] text-brown-300 md:text-xl md:leading-[30px]"
          >
            {t("subtitle")}
            <br className="hidden md:block" /> {t("patronPrefix")}{" "}
            <strong className="font-black text-brown-500">{t("patron")}</strong>
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <span data-hero-cta>
            <PillButton href="#programs" variant="primary" withArrow>
              {t("ctaPrimary")}
            </PillButton>
          </span>
          <span data-hero-cta>
            <PillButton href="#apply" variant="outline">
              {t("ctaSecondary")}
            </PillButton>
          </span>
        </div>
      </div>

      {/* Campus film, blended into the cream sky */}
      <div
        data-hero-image
        className="relative mt-10 h-[300px] w-full sm:h-[400px] md:mt-14 md:h-[540px] lg:h-[620px]"
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
          className="absolute inset-0 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-creamy-100 from-5% via-creamy-100/35 via-40% to-transparent"
        />
      </div>
    </section>
  );
}
