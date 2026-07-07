import { useTranslations, useMessages } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

type TestimonialItem = {
  name: string;
  role: string;
  quote: string;
};

const AVATAR_TINTS = [
  "bg-red-100 text-red-800",
  "bg-creamy-400 text-brown-500",
  "bg-blue-50 text-blue-500",
  "bg-brown-50 text-brown-500",
];

function Stars() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="size-[18px] text-red-500">
          <path d="M12 2.5 14.9 8.6l6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5Z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ item, tint }: { item: TestimonialItem; tint: string }) {
  return (
    <figure className="flex w-[300px] shrink-0 flex-col gap-5 rounded-card border border-line bg-card p-7 md:w-[350px]">
      <figcaption className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex size-[52px] items-center justify-center rounded-full font-serif text-lg font-bold ${tint}`}
        >
          {item.name.slice(0, 1)}
        </span>
        <span className="flex flex-col">
          <span className="font-serif text-[16px] font-bold text-brown-900">{item.name}</span>
          <span className="font-serif text-sm font-light text-brown-400">{item.role}</span>
        </span>
      </figcaption>
      <blockquote className="flex-1 font-serif text-[16px] font-light leading-[1.85] text-brown-400">
        {item.quote}
      </blockquote>
      <Stars />
    </figure>
  );
}

export default function Testimonials() {
  const t = useTranslations("testimonials");
  const messages = useMessages() as {
    testimonials: { items: TestimonialItem[] };
  };
  const items = messages.testimonials.items;
  const rowA = items.filter((_, i) => i % 2 === 0);
  const rowB = items.filter((_, i) => i % 2 === 1);

  return (
    <section aria-labelledby="testimonials-label" className="overflow-hidden bg-creamy-100 py-16 md:py-24">
      <Reveal className="flex flex-col gap-10 md:gap-14">
        <div className="mx-auto max-w-[1248px] px-4 md:px-8">
          <SectionHeader label={t("label")} subtitle={t("subtitle")} />
        </div>

        <div
          className="marquee-paused flex flex-col gap-5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
          data-reveal
          dir="ltr"
        >
          {[
            { row: rowA, reverse: false },
            { row: rowB, reverse: true },
          ].map(({ row, reverse }, rowIndex) => (
            <div key={rowIndex} className="flex overflow-hidden">
              <div
                className={`flex w-max gap-5 pe-5 ${reverse ? "marquee-track-reverse" : "marquee-track"}`}
                style={{ "--marquee-duration": "70s" } as React.CSSProperties}
              >
                {[...row, ...row].map((item, i) => (
                  <div key={`${item.name}-${i}`} dir="auto">
                    <TestimonialCard item={item} tint={AVATAR_TINTS[i % AVATAR_TINTS.length]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
