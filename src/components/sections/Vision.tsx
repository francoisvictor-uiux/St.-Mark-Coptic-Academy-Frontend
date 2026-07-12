"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations, useMessages } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Reveal from "@/components/ui/Reveal";
import StatCounter from "@/components/ui/StatCounter";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type StatItem = { value: number; label: string };

export type VisionData = {
  label?: string; subtitle?: string; cardTitle?: string; body?: string;
  image1?: string; image2?: string; stats?: StatItem[];
};

type TabKey = "vision" | "mission";
const TABS: TabKey[] = ["vision", "mission"];

// Cross.svg tinted to the current text colour via mask.
const CROSS_ICON: React.CSSProperties = {
  backgroundColor: "currentColor",
  WebkitMaskImage: "url(/Cross.svg)",
  maskImage: "url(/Cross.svg)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

export default function Vision({ data, showStats = true }: { data?: VisionData; showStats?: boolean }) {
  const t = useTranslations("vision");
  const messages = useMessages() as { stats: { items: StatItem[] } };
  const stats = data?.stats && data.stats.length > 0 ? data.stats : messages.stats.items;

  const [tab, setTab] = useState<TabKey>("vision");
  const [shown, setShown] = useState<TabKey>("vision");

  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const kicker = useRef<HTMLParagraphElement>(null);
  const tabsBar = useRef<HTMLDivElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const firstSwap = useRef(true);

  const headlineText = shown === "vision" ? t("visionHeadline") : t("missionHeadline");
  const bodyText = shown === "vision" ? data?.body || t("body") : t("missionBody");

  const moveHighlight = (animate: boolean) => {
    const bar = tabsBar.current;
    const hl = highlight.current;
    if (!bar || !hl) return;
    const active = bar.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    // Layout-based offsets — immune to the section's perspective/scale entrance
    // transform (getBoundingClientRect would be distorted by it).
    const x = active.offsetLeft;
    const width = active.offsetWidth;
    if (animate) gsap.to(hl, { x, width, duration: 0.45, ease: "power3.out" });
    else gsap.set(hl, { x, width });
  };

  // Background parallax, sliding highlight init, and scroll-in text reveal.
  const { contextSafe } = useGSAP(
    () => {
      // Perspective section transition (à la Olivier Larose): the panel rises
      // from a scaled-down, tilted-back rounded card with a soft depth shadow
      // and settles flat, full-bleed, as the section scrolls into place.
      if (stage.current) {
        gsap.set(stage.current, { transformPerspective: 1400, transformOrigin: "50% 50%" });
        gsap.fromTo(
          stage.current,
          {
            scale: 0.82,
            rotationX: 13,
            yPercent: 7,
            borderRadius: 56,
            boxShadow: "0 50px 110px -35px rgba(36,17,15,0.55)",
          },
          {
            scale: 1,
            rotationX: 0,
            yPercent: 0,
            borderRadius: 0,
            boxShadow: "0 0px 0px 0px rgba(36,17,15,0)",
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "top 6%", scrub: 0.6 },
          },
        );
      }
      if (bg.current) {
        gsap.fromTo(
          bg.current,
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      }
      moveHighlight(false);
      const els = [kicker.current, tabsBar.current, headline.current, body.current];
      gsap.set(els, { autoAlpha: 0, y: 44 });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top 68%",
        once: true,
        onEnter: () => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", stagger: 0.14 }),
      });
      // Keep the tab highlight aligned when the layout reflows.
      const onResize = () => moveHighlight(false);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    },
    { scope: root },
  );

  // Smooth reveal of the swapped content (skips the initial render).
  useGSAP(
    () => {
      if (firstSwap.current) {
        firstSwap.current = false;
        return;
      }
      gsap.fromTo(
        [headline.current, body.current],
        { autoAlpha: 0, y: 26 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.08, overwrite: true },
      );
    },
    { dependencies: [shown], scope: root },
  );

  // Slide the tab highlight to the active tab.
  useGSAP(() => moveHighlight(true), { dependencies: [tab], scope: root });

  const changeTab = contextSafe((next: TabKey) => {
    if (next === tab) return;
    setTab(next);
    gsap.to([headline.current, body.current], {
      autoAlpha: 0,
      y: -20,
      duration: 0.3,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => setShown(next),
    });
  });

  return (
    <section id="vision" ref={root} aria-labelledby="vision-title" className="bg-creamy-100">
      {/* Cinematic campus image with parallax */}
      <div ref={stage} className="relative h-[88vh] min-h-[560px] w-full overflow-hidden [will-change:transform]">
        <div ref={bg} className="absolute inset-x-0 -top-[10%] h-[120%] [will-change:transform]">
          <Image
            src="/images/vision-mission.jpg"
            alt={t("imageAlt")}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        {/* Legibility gradient (top + bottom darkened) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-brown-900/92 via-brown-900/72 to-brown-900/97"
        />

        <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-between px-5 py-10 md:px-12 md:py-16">
          {/* Top: kicker + tabs */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p
              ref={kicker}
              className="flex items-center gap-2.5 font-sans text-[16px] font-semibold uppercase tracking-[0.16em] text-creamy-100/90 md:text-[20px]"
            >
              <span aria-hidden="true" className="size-[1.05em] shrink-0" style={CROSS_ICON} />
              {t("kicker")}
            </p>
            <div
              ref={tabsBar}
              role="tablist"
              aria-label={t("kicker")}
              className="relative inline-flex w-fit items-center gap-1 rounded-full bg-creamy-100/12 p-1 shadow-[inset_0_0_0_1px_rgba(254,246,240,0.22)] backdrop-blur-md"
            >
              <span
                ref={highlight}
                aria-hidden="true"
                className="absolute inset-y-1 left-0 rounded-full bg-creamy-100"
                style={{ width: 0 }}
              />
              {TABS.map((key) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active={active}
                    onClick={() => changeTab(key)}
                    className={`relative z-10 flex h-9 items-center justify-center rounded-full px-5 font-serif text-[15px] font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-creamy-100 md:h-10 md:text-[16px] ${
                      active ? "text-brown-900" : "text-creamy-100/80 hover:text-creamy-100"
                    }`}
                  >
                    {t(key === "vision" ? "visionTab" : "missionTab")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom: headline + body */}
          <div className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <h2
              id="vision-title"
              ref={headline}
              className="max-w-[15ch] text-balance font-serif text-[34px] font-medium leading-[1.1] text-creamy-50 sm:text-5xl md:text-6xl lg:text-[68px]"
            >
              {headlineText}
            </h2>
            <p
              ref={body}
              className="font-serif text-[16px] font-light leading-[1.85] text-creamy-100/90 md:text-[18px]"
            >
              {bodyText}
            </p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {showStats ? (
        <Reveal className="mx-auto max-w-[1248px] px-4 py-14 md:px-8 md:py-20">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:justify-items-center">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2" data-reveal>
                <dd className="flex items-start gap-1 text-brown-900" dir="ltr">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="mt-1 size-6 text-red-500 md:size-[30px]"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <StatCounter
                    value={stat.value}
                    className="font-archivo text-[56px] font-light leading-none md:text-[80px]"
                  />
                </dd>
                <dt className="font-serif text-[16px] font-light text-brown-400 md:text-[18.4px]">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </Reveal>
      ) : null}
    </section>
  );
}
