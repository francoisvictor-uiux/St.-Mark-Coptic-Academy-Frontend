import Image from "next/image";
import { useTranslations, useMessages } from "next-intl";
import { Link } from "@/i18n/navigation";
import SectionHeader from "@/components/ui/SectionHeader";
import PillButton from "@/components/ui/PillButton";
import ArrowIcon from "@/components/ui/ArrowIcon";
import Reveal from "@/components/ui/Reveal";

type ProgramItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: "open" | "soon" | "closed";
  image: string;
};

const STATUS_STYLES: Record<ProgramItem["status"], string> = {
  open: "bg-red-50 text-red-800",
  soon: "bg-creamy-300 text-brown-400",
  closed: "bg-ink-50 text-ink-400",
};

export default function Programs({ items: itemsProp, labels }: { items?: ProgramItem[]; labels?: { label?: string; subtitle?: string } }) {
  const t = useTranslations("programs");
  const messages = useMessages() as {
    programs: { items: ProgramItem[] };
  };
  const programs = itemsProp && itemsProp.length > 0 ? itemsProp : messages.programs.items;

  return (
    <section id="programs" aria-labelledby="programs-label" className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={labels?.label || t("label")} subtitle={labels?.subtitle || t("subtitle")} />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {programs.map((program) => (
            <article key={program.id} data-reveal className="group h-[430px]">
              <Link
                href="/programs"
                aria-label={`${t("cardCta")}: ${program.title}`}
                className="relative block h-full overflow-hidden rounded-card shadow-[0_0_40px_-18px_rgba(86,40,35,0.45)] transition-all duration-500 ease-in-out group-hover:scale-[1.03] group-hover:shadow-[0_0_60px_-15px_rgba(86,40,35,0.65)] motion-reduce:group-hover:scale-100"
              >
                {/* Full-bleed image with parallax zoom */}
                <Image
                  src={program.image}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
                />

                {/* Brand gradient overlay */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(to_top,rgba(56,25,21,0.94),rgba(86,40,35,0.62)_38%,rgba(86,40,35,0.12)_68%,transparent_82%)]"
                />

                <span
                  className={`absolute top-4 start-4 rounded-full px-3.5 py-1.5 font-serif text-[13px] font-bold ${STATUS_STYLES[program.status]}`}
                >
                  {t(`status.${program.status}`)}
                </span>

                {/* Content over the image */}
                <div className="relative flex h-full flex-col justify-end gap-2.5 p-6 text-creamy-50">
                  <h3 className="font-serif text-xl font-bold leading-snug">
                    {program.title}
                  </h3>
                  <p className="font-serif text-[14.5px] font-light leading-[1.7] text-creamy-100/85">
                    {program.description}
                  </p>
                  <p className="flex items-center gap-2 font-serif text-sm text-creamy-100/70">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                    <span>
                      {t("duration")}: {program.duration}
                    </span>
                  </p>

                  {/* Glass CTA bar */}
                  <div className="mt-3 flex items-center justify-between rounded-full border border-creamy-100/25 bg-creamy-100/10 px-5 py-3 font-serif text-[15px] font-bold backdrop-blur-md transition-all duration-300 group-hover:border-creamy-100/45 group-hover:bg-creamy-100/20">
                    <span>{t("cardCta")}</span>
                    <ArrowIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:rtl:-translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="flex justify-center" data-reveal>
          <PillButton href="/programs" variant="outline">
            {t("showAll")}
          </PillButton>
        </div>
      </Reveal>
    </section>
  );
}
