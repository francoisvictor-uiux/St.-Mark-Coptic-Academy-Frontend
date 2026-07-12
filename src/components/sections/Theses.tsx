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

const BRAND = "#562823"; // brown-500 — resting brand colour
const PINK = "#7a2f43"; // deep rose — dark enough to keep creamy text WCAG-AA

export default function Theses({ items: itemsProp, labels }: { items?: ThesisItem[]; labels?: { label?: string; subtitle?: string } }) {
  const t = useTranslations("theses");
  const messages = useMessages() as {
    theses: { items: ThesisItem[] };
  };
  const theses = itemsProp && itemsProp.length > 0 ? itemsProp : messages.theses.items;
  const bandRef = useRef<HTMLDivElement>(null);

  // LERP the band colour toward pink while the pointer is over the section and
  // ease it back to the brand colour on leave — a value smoothed each frame by
  // GSAP's ticker (not a fixed-duration tween), so it tracks enter/leave fluidly.
  useGSAP(
    () => {
      const el = bandRef.current;
      if (!el) return;
      let current = 0; // 0 = brand, 1 = pink
      let target = 0;
      let running = false;

      const paint = () => {
        el.style.backgroundColor = gsap.utils.interpolate(BRAND, PINK, current) as string;
      };
      const tick = () => {
        current += (target - current) * 0.08; // ← the LERP
        if (Math.abs(target - current) < 0.001) {
          current = target;
          paint();
          stop();
          return;
        }
        paint();
      };
      const start = () => {
        if (!running) {
          running = true;
          gsap.ticker.add(tick);
        }
      };
      function stop() {
        if (running) {
          running = false;
          gsap.ticker.remove(tick);
        }
      }

      const enter = () => { target = 1; start(); };
      const leave = () => { target = 0; start(); };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      paint();

      return () => {
        stop();
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: bandRef },
  );

  return (
    <section id="theses" aria-labelledby="theses-label" className="bg-creamy-100 py-8 md:py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        {/* Dark editorial band, echoing the vision card surface */}
        <Reveal>
          <div
            ref={bandRef}
            style={{ backgroundColor: BRAND }}
            className="rounded-card bg-brown-500 px-6 py-14 md:px-14 md:py-20"
          >
            <div className="mx-auto flex max-w-[1248px] flex-col gap-10 md:gap-14 [&_h2]:text-creamy-100 [&_svg]:text-creamy-100 [&_p]:text-creamy-100/70">
              <SectionHeader label={labels?.label || t("label")} subtitle={labels?.subtitle || t("subtitle")} />
            </div>

            <div className="mx-auto mt-10 grid max-w-[1248px] gap-5 md:mt-14 md:grid-cols-2 xl:grid-cols-4">
              {theses.map((thesis) => (
                <article
                  key={thesis.title}
                  data-reveal
                  className="group flex flex-col gap-4 rounded-[28px] border border-creamy-100/15 bg-creamy-100/[0.06] p-6 transition-colors duration-300 hover:bg-creamy-100/10"
                >
                  <span className="w-fit rounded-full bg-red-500/90 px-3.5 py-1 font-serif text-[13px] font-bold text-creamy-50">
                    {thesis.degree}
                  </span>
                  <h3 className="flex-1 font-serif text-[17px] font-bold leading-[1.7] text-creamy-50">
                    {thesis.title}
                  </h3>
                  <dl className="flex flex-col gap-1.5 border-t border-creamy-100/15 pt-4 font-serif text-sm font-light text-creamy-100/80">
                    <div className="flex gap-2">
                      <dt className="text-creamy-100/70">{t("researcher")}:</dt>
                      <dd>{thesis.researcher}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dd>{thesis.institution}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-creamy-100/70">{t("year")}:</dt>
                      <dd dir="ltr">{thesis.year}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="mt-10 flex justify-center md:mt-14" data-reveal>
              <PillButton href="/theses" variant="light" withArrow>
                {t("showAll")}
              </PillButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
