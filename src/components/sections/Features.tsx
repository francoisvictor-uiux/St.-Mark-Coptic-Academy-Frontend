"use client";

import { useRef, useState } from "react";
import { useTranslations, useMessages } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

type FeatureItem = {
  index: string;
  title: string;
  summary: string;
  body: string;
};

export default function Features({ items: itemsProp, labels }: { items?: FeatureItem[]; labels?: { label?: string; subtitle?: string } }) {
  const t = useTranslations("features");
  const messages = useMessages() as {
    features: { items: FeatureItem[] };
  };
  const items = itemsProp && itemsProp.length > 0 ? itemsProp : messages.features.items;

  const [open, setOpen] = useState<number | null>(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: listRef });

  // eslint-disable-next-line react-hooks/refs -- official useGSAP contextSafe pattern; refs are only read inside the event callback
  const toggle = contextSafe((index: number) => {
    const next = open === index ? null : index;
    setOpen(next);

    const panels = gsap.utils.toArray<HTMLElement>("[data-feature-panel]", listRef.current);
    panels.forEach((panel, i) => {
      gsap.to(panel, {
        height: next === i ? "auto" : 0,
        autoAlpha: next === i ? 1 : 0,
        duration: 0.55,
        ease: "power3.inOut",
      });
    });
  });

  return (
    <section id="features" aria-labelledby="features-label" className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={labels?.label || t("label")} subtitle={labels?.subtitle || t("subtitle")} />

        <div ref={listRef} className="flex flex-col">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.index} className="border-b border-line" data-reveal>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`feature-panel-${i}`}
                    onClick={() => toggle(i)}
                    className="group flex w-full items-center justify-between gap-6 py-5 text-start md:py-6"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="font-serif text-[16px] font-light text-red-500 md:text-lg">
                        {item.index}
                      </span>
                      <span className="font-serif text-2xl font-bold text-brown-900 transition-colors group-hover:text-brown-500 md:text-[40px] md:leading-[1.5]">
                        {item.title}
                      </span>
                      <span className="font-serif text-[16px] font-light text-brown-400 md:text-xl">
                        {item.summary}
                      </span>
                    </span>
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full border border-brown-400 text-brown-500 transition-transform duration-500 ${
                        isOpen ? "rotate-45" : ""
                      } motion-reduce:transition-none`}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-[18px]">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div
                  id={`feature-panel-${i}`}
                  data-feature-panel
                  role="region"
                  aria-label={item.title}
                  className="overflow-hidden"
                  style={i === 0 ? undefined : { height: 0, opacity: 0, visibility: "hidden" }}
                >
                  <p className="max-w-[820px] pb-6 font-serif text-[16px] font-light leading-[1.8] text-brown-400 md:text-lg">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
