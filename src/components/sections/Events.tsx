"use client";

import { useRef, useState } from "react";
import { useTranslations, useMessages } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import SectionHeader from "@/components/ui/SectionHeader";
import LogoMark from "@/components/ui/LogoMark";
import Reveal from "@/components/ui/Reveal";

type EventItem = {
  type: "conference" | "seminar" | "discussion";
  title: string;
  day: string;
  month: string;
  year: string;
  dateRange: string;
  location: string;
  status: "open" | "full" | "online";
};

type FilterKey = "all" | EventItem["type"];

const FILTERS: FilterKey[] = ["all", "conference", "seminar", "discussion"];

const STATUS_STYLES: Record<EventItem["status"], string> = {
  open: "bg-red-50 text-red-800",
  online: "bg-blue-50 text-blue-500",
  full: "bg-ink-50 text-ink-400",
};

export default function Events({ items }: { items?: EventItem[] }) {
  const t = useTranslations("events");
  const messages = useMessages() as {
    events: { items: EventItem[] };
  };
  const events = items && items.length > 0 ? items : messages.events.items;

  const [filter, setFilter] = useState<FilterKey>("all");
  const listRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: listRef });

  const visible = events.filter((e) => filter === "all" || e.type === filter);

  // eslint-disable-next-line react-hooks/refs -- official useGSAP contextSafe pattern; refs are only read inside the event callback
  const changeFilter = contextSafe((next: FilterKey) => {
    setFilter(next);
    gsap.fromTo(
      listRef.current,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" },
    );
  });

  return (
    <section id="events" aria-labelledby="events-label" className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={t("label")} subtitle={t("subtitle")} />

        {/* Filters */}
        <div role="group" aria-label={t("label")} className="flex flex-wrap justify-center gap-2" data-reveal>
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => changeFilter(key)}
              className={`h-11 rounded-full px-5 font-serif text-[15px] font-bold transition-colors duration-300 ${
                filter === key
                  ? "bg-brown-500 text-creamy-50"
                  : "border border-line text-brown-400 hover:border-brown-300 hover:text-brown-500"
              }`}
            >
              {t(`filters.${key}`)}
            </button>
          ))}
        </div>

        {/* Event rows */}
        <div ref={listRef} className="flex flex-col" data-reveal>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line py-16 text-center">
              <LogoMark className="size-10 text-brown-100" />
              <p className="max-w-md font-serif text-lg font-light text-brown-400">{t("emptyState")}</p>
            </div>
          ) : (
            visible.map((event) => (
              <article
                key={event.title}
                className="flex flex-col gap-5 border-b border-line py-7 md:flex-row md:items-center md:gap-8"
              >
                {/* Date block */}
                <div className="flex shrink-0 items-center gap-4 md:w-32 md:flex-col md:gap-0 md:text-center">
                  <span className="font-archivo text-5xl font-light text-brown-900 md:text-6xl" dir="ltr">
                    {event.day}
                  </span>
                  <span className="font-serif text-[15px] text-brown-400">
                    {event.month} {event.year}
                  </span>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-serif text-xl font-bold text-brown-900 md:text-2xl">
                      {event.title}
                    </h3>
                    <span
                      className={`rounded-full px-3.5 py-1 font-serif text-[13px] font-bold ${STATUS_STYLES[event.status]}`}
                    >
                      {t(`status.${event.status}`)}
                    </span>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-serif text-[15px] font-light text-brown-400">
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="16" rx="3" />
                        <path d="M3 10h18M8 3v4M16 3v4" />
                      </svg>
                      {event.dateRange}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
                        <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {event.location}
                    </span>
                  </p>
                </div>

                {/* CTA */}
                <div className="shrink-0">
                  {event.status === "full" ? (
                    <span className="inline-flex h-12 cursor-not-allowed items-center rounded-full border border-line px-6 font-serif text-[15px] font-bold text-brown-200">
                      {t("registered")}
                    </span>
                  ) : (
                    <a
                      href="#apply"
                      className="inline-flex h-12 items-center rounded-full border border-brown-500 px-6 font-serif text-[15px] font-bold text-brown-500 transition-colors hover:bg-brown-500 hover:text-creamy-50"
                    >
                      {t("register")}
                    </a>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </Reveal>
    </section>
  );
}
