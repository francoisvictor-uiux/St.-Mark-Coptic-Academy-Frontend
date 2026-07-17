"use client";

import { useRef } from "react";
import { useTranslations, useMessages } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import SectionHeader from "@/components/ui/SectionHeader";
import PillButton from "@/components/ui/PillButton";
import Reveal from "@/components/ui/Reveal";

gsap.registerPlugin(useGSAP);

type ThesisItem = {
  title: string;
  researcher: string;
  degree: string;
  institution: string;
  year: string;
};

const RADIUS = 200; // px radius of the cursor reveal circle

// Pattern-cream.svg is Pattern.svg recoloured: the logo shapes are creamy and
// the white inner detail is knocked out to transparent, so the band colour
// shows through it. It is deliberately NOT used as a mask — a mask flattens the
// alpha of both tones together, which fuses every logo into a solid blob and
// makes the units read as collapsed/overlapping.
const PATTERN_SRC = "url(/Pattern-cream.svg)";

// The tile is one full 374x212 block of the logo grid. Both axes are pinned
// (never height:auto — SVG backgrounds resolve `auto` unpredictably and squash
// the tile, which is what overlapped the units), scaled up 1.25x so each logo
// sits further from its neighbours. Keep the 374:212 ratio when tuning or the
// horizontal and vertical spacing stop matching.
const PATTERN_TILE = "468px 265px";

// Rises out of the very bottom of the band and dissolves quickly, so the
// pattern stays a whisper and never reaches the heading.
const PATTERN_FADE =
  "linear-gradient(to top, #000 0%, rgba(0,0,0,0.35) 20%, transparent 55%)";

const PATTERN_STYLE = (dark: boolean): React.CSSProperties => ({
  backgroundImage: PATTERN_SRC,
  backgroundRepeat: "repeat",
  backgroundSize: PATTERN_TILE,
  opacity: dark ? 0.12 : 0.1,
  WebkitMaskImage: PATTERN_FADE,
  maskImage: PATTERN_FADE,
});

export default function Theses({ items: itemsProp, labels }: { items?: ThesisItem[]; labels?: { label?: string; subtitle?: string } }) {
  const t = useTranslations("theses");
  const messages = useMessages() as {
    theses: { items: ThesisItem[] };
  };
  const theses = itemsProp && itemsProp.length > 0 ? itemsProp : messages.theses.items;

  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);

  // Cursor-hover-mask (Olivier Larose technique): a second, pink/creamy copy of
  // the whole band sits on top, revealed only inside a circle that follows the
  // pointer. Each layer is internally high-contrast, so the reveal is WCAG-safe.
  useGSAP(
    () => {
      const container = containerRef.current;
      const mask = maskRef.current;
      if (!container || !mask) return;

      // quickTo can't reliably animate CSS custom properties, so LERP the mask
      // centre by hand on GSAP's ticker and write the vars with setProperty.
      let tx = -9999;
      let ty = -9999;
      let cx = -9999;
      let cy = -9999;
      let running = false;
      const paint = () => {
        mask.style.setProperty("--x", `${cx}`);
        mask.style.setProperty("--y", `${cy}`);
      };
      const tick = () => {
        cx += (tx - cx) * 0.15;
        cy += (ty - cy) * 0.15;
        paint();
      };
      const start = () => {
        if (!running) {
          running = true;
          gsap.ticker.add(tick);
        }
      };
      const stop = () => {
        if (running) {
          running = false;
          gsap.ticker.remove(tick);
        }
      };
      const local = (e: PointerEvent): [number, number] => {
        const r = mask.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };

      const enter = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const [x, y] = local(e);
        tx = cx = x;
        ty = cy = y;
        paint();
        start();
        gsap.to(mask, { "--r": RADIUS, duration: 0.5, ease: "power2.out", overwrite: true });
      };
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        [tx, ty] = local(e);
      };
      const leave = () => {
        stop();
        gsap.to(mask, { "--r": 0, duration: 0.5, ease: "power2.out", overwrite: true });
      };

      container.addEventListener("pointerenter", enter);
      container.addEventListener("pointermove", move);
      container.addEventListener("pointerleave", leave);
      return () => {
        stop();
        container.removeEventListener("pointerenter", enter);
        container.removeEventListener("pointermove", move);
        container.removeEventListener("pointerleave", leave);
      };
    },
    { scope: containerRef },
  );

  // One band, rendered light (base) or dark-on-pink (reveal copy).
  const band = (dark: boolean) => (
    <div
      className={`relative overflow-hidden rounded-card px-6 py-14 md:px-14 md:py-20 ${
        dark ? "bg-[#D46A6B]" : "bg-brown-500"
      }`}
    >
      {/* Creamy Coptic pattern wash, rising out of the bottom of the band.
          Absolutely positioned behind the content (which is `relative`), so it
          can never overlap the text. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={PATTERN_STYLE(dark)} />

      <div
        className={`relative mx-auto flex max-w-[1248px] flex-col gap-10 md:gap-14 ${
          dark
            ? "[&_h2]:text-creamy-100 [&_svg]:text-creamy-100 [&_p]:text-creamy-100"
            : "[&_h2]:text-creamy-100 [&_svg]:text-creamy-100 [&_p]:text-creamy-100/70"
        }`}
      >
        <SectionHeader label={labels?.label || t("label")} subtitle={labels?.subtitle || t("subtitle")} />
      </div>

      <div className="relative mx-auto mt-10 grid max-w-[1248px] gap-5 md:mt-14 md:grid-cols-2 xl:grid-cols-4">
        {theses.map((thesis) => (
          <article
            key={thesis.title}
            {...(!dark && { "data-reveal": true })}
            className={`flex flex-col gap-4 rounded-[28px] border p-6 ${
              dark ? "border-brown-900/10 bg-[#FEF6F0]" : "border-creamy-100/15 bg-creamy-100/[0.06]"
            }`}
          >
            <span className="w-fit rounded-full bg-red-500/90 px-3.5 py-1 font-serif text-[13px] font-bold text-creamy-50">
              {thesis.degree}
            </span>
            <h3 className={`flex-1 font-serif text-[17px] font-bold leading-[1.7] ${dark ? "text-brown-900" : "text-creamy-50"}`}>
              {thesis.title}
            </h3>
            <dl
              className={`flex flex-col gap-1.5 border-t pt-4 font-serif text-sm font-light ${
                dark ? "border-brown-900/15 text-brown-800" : "border-creamy-100/15 text-creamy-100/80"
              }`}
            >
              <div className="flex gap-2">
                <dt className={dark ? "text-brown-500" : "text-creamy-100/70"}>{t("researcher")}:</dt>
                <dd>{thesis.researcher}</dd>
              </div>
              <div className="flex gap-2">
                <dd>{thesis.institution}</dd>
              </div>
              <div className="flex gap-2">
                <dt className={dark ? "text-brown-500" : "text-creamy-100/70"}>{t("year")}:</dt>
                <dd dir="ltr">{thesis.year}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="relative mt-10 flex justify-center md:mt-14" {...(!dark && { "data-reveal": true })}>
        <PillButton href="/theses" variant="light" withArrow>
          {t("showAll")}
        </PillButton>
      </div>
    </div>
  );

  const mask =
    "radial-gradient(circle calc(var(--r,0) * 1px) at calc(var(--x,-9999) * 1px) calc(var(--y,-9999) * 1px), #000 99%, transparent 100%)";

  return (
    <section id="theses" aria-labelledby="theses-label" className="bg-creamy-100 py-8 md:py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div ref={containerRef} className="relative overflow-hidden rounded-card">
          {/* Base layer — scroll-revealed, fully interactive */}
          <Reveal>{band(false)}</Reveal>

          {/* Reveal copy — pink + creamy, shown through the cursor circle.
              `inert` keeps its duplicated content out of tab order & a11y tree. */}
          <div
            ref={maskRef}
            aria-hidden="true"
            inert
            className="pointer-events-none absolute inset-0"
            style={
              {
                "--x": -9999,
                "--y": -9999,
                "--r": 0,
                WebkitMaskImage: mask,
                maskImage: mask,
              } as React.CSSProperties
            }
          >
            {band(true)}
          </div>
        </div>
      </div>
    </section>
  );
}
