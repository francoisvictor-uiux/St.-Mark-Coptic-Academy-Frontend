import Image from "next/image";
import { useTranslations, useMessages } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";
import StatCounter from "@/components/ui/StatCounter";

type StatItem = { value: number; label: string };

export type VisionData = {
  label?: string; subtitle?: string; cardTitle?: string; body?: string;
  image1?: string; image2?: string; stats?: StatItem[];
};

export default function Vision({ data }: { data?: VisionData }) {
  const t = useTranslations("vision");
  const messages = useMessages() as {
    stats: { items: StatItem[] };
  };
  const stats = data?.stats && data.stats.length > 0 ? data.stats : messages.stats.items;

  return (
    <section id="vision" aria-labelledby="vision-title" className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={data?.label || t("label")} subtitle={data?.subtitle || t("subtitle")} />

        <div className="grid gap-[30px] lg:grid-cols-[1fr_407px]">
          {/* Vision card */}
          <article
            data-reveal
            className="relative overflow-hidden rounded-card bg-brown-500 p-8 pb-32 text-creamy-100 md:p-14 md:pb-36 lg:min-h-[570px]"
          >
            <h3 id="vision-title" className="font-serif text-3xl font-medium md:text-5xl md:leading-[1.6]">
              {data?.cardTitle || t("cardTitle")}
            </h3>
            <p className="mt-6 max-w-[704px] font-serif text-lg font-light leading-[1.75] text-creamy-100/95 md:text-2xl md:leading-[38px]">
              {data?.body || t("body")}
            </p>

            {/* Inverted-corner notch with the red cross medallion (Figma motif) */}
            <div aria-hidden="true" className="absolute bottom-0 left-0">
              <div className="relative flex h-[120px] w-[150px] items-end md:h-[140px] md:w-[170px]">
                <div className="flex h-full w-full items-center justify-center rounded-tr-card bg-creamy-100">
                  <div className="flex size-[90px] items-center justify-center rounded-full bg-red-500 md:size-[110px]">
                    <Image
                      src="/Logo.svg"
                      alt=""
                      width={51}
                      height={51}
                      className="size-[42px] md:size-[51px]"
                    />
                  </div>
                </div>
                {/* concave corner pieces */}
                <div className="absolute -top-10 left-0 size-10 [background:radial-gradient(circle_40px_at_100%_0%,transparent_40px,var(--color-creamy-100)_40px)]" />
                <div className="absolute bottom-0 -right-10 size-10 [background:radial-gradient(circle_40px_at_100%_0%,transparent_40px,var(--color-creamy-100)_40px)]" />
              </div>
            </div>
          </article>

          {/* Side imagery */}
          <div className="grid grid-cols-2 gap-[30px] lg:grid-cols-1 lg:grid-rows-[327px_213px]">
            <div data-reveal className="relative h-48 overflow-hidden rounded-card sm:h-64 lg:h-auto">
              <Image
                src={data?.image1 || "/images/photo-2.jpg"}
                alt={t("imageAlt1")}
                fill
                sizes="(min-width: 1024px) 407px, 50vw"
                className="object-cover"
              />
            </div>
            <div data-reveal className="relative h-48 overflow-hidden rounded-card sm:h-64 lg:h-auto">
              <Image
                src={data?.image2 || "/images/photo-1.jpg"}
                alt={t("imageAlt2")}
                fill
                sizes="(min-width: 1024px) 407px, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 py-6 md:py-14 lg:grid-cols-4 lg:justify-items-center">
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
    </section>
  );
}
