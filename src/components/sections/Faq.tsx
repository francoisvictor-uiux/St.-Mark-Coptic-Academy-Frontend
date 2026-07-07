"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useTranslations, useMessages } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

type FaqItem = {
  question: string;
  answer: string;
};

export default function Faq() {
  const t = useTranslations("faq");
  const tNav = useTranslations("nav");
  const messages = useMessages() as {
    faq: { items: FaqItem[] };
  };
  const items = messages.faq.items;

  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: listRef });

  const normalized = query.trim();
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !normalized || item.question.includes(normalized) || item.answer.includes(normalized));

  // eslint-disable-next-line react-hooks/refs -- official useGSAP contextSafe pattern; refs are only read inside the event callback
  const toggle = contextSafe((index: number) => {
    const next = open === index ? null : index;
    setOpen(next);

    const panels = gsap.utils.toArray<HTMLElement>("[data-faq-panel]", listRef.current);
    panels.forEach((panel) => {
      const i = Number(panel.dataset.faqIndex);
      gsap.to(panel, {
        height: next === i ? "auto" : 0,
        autoAlpha: next === i ? 1 : 0,
        duration: 0.5,
        ease: "power3.inOut",
      });
    });
  });

  return (
    <section id="faq" aria-labelledby="faq-label" className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={t("label")} subtitle={t("subtitle")} />

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,460px)_1fr] lg:gap-16">
          {/* Image column */}
          <div data-reveal className="relative hidden h-[350px] self-center overflow-hidden rounded-card lg:block">
            <Image
              src="/images/campus-2.webp"
              alt={t("imageAlt")}
              fill
              sizes="(min-width: 1024px) 460px, 0px"
              className="object-cover"
            />
          </div>

          {/* FAQ list */}
          <div className="flex flex-col gap-6">
            {/* Search inside the FAQ */}
            <div data-reveal className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-brown-200"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tNav("searchPlaceholder")}
                aria-label={tNav("search")}
                className="h-14 w-full rounded-full border border-line bg-card ps-12 pe-5 font-serif text-[16px] text-brown-900 transition-colors placeholder:text-brown-100 focus:border-brown-400 focus:outline-none"
              />
            </div>

            <div ref={listRef} className="flex flex-col" data-reveal>
              {visible.length === 0 ? (
                <p className="py-10 text-center font-serif text-lg font-light text-brown-400">
                  {t("noResults")}
                </p>
              ) : (
                visible.map(({ item, index }) => {
                  const isOpen = open === index;
                  return (
                    <div key={item.question} className="border-b border-line">
                      <h3>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`faq-panel-${index}`}
                          onClick={() => toggle(index)}
                          className="group flex w-full items-center justify-between gap-5 py-6 text-start"
                        >
                          <span className="font-serif text-[17px] font-medium leading-[1.7] text-brown-900 transition-colors group-hover:text-brown-500 md:text-[21.6px]">
                            {item.question}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`flex size-9 shrink-0 items-center justify-center rounded-full border border-brown-400 text-brown-500 transition-transform duration-500 motion-reduce:transition-none ${
                              isOpen ? "rotate-45" : ""
                            }`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                        </button>
                      </h3>
                      <div
                        id={`faq-panel-${index}`}
                        data-faq-panel
                        data-faq-index={index}
                        role="region"
                        aria-label={item.question}
                        className="overflow-hidden"
                        style={index === 0 ? undefined : { height: 0, opacity: 0, visibility: "hidden" }}
                      >
                        <p className="pb-6 font-serif text-[15.5px] font-light leading-[1.85] text-brown-400">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
