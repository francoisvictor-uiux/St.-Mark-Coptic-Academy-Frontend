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

export default function Programs() {
  const t = useTranslations("programs");
  const messages = useMessages() as {
    programs: { items: ProgramItem[] };
  };
  const programs = messages.programs.items;

  return (
    <section id="programs" aria-labelledby="programs-label" className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={t("label")} subtitle={t("subtitle")} />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {programs.map((program) => (
            <article
              key={program.id}
              data-reveal
              className="group flex flex-col overflow-hidden rounded-card border border-line bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-brown-200 motion-reduce:hover:translate-y-0"
            >
              <div className="relative h-44 overflow-hidden">
                <Image
                  src={program.image}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                />
                <span
                  className={`absolute top-4 start-4 rounded-full px-3.5 py-1.5 font-serif text-[13px] font-bold ${STATUS_STYLES[program.status]}`}
                >
                  {t(`status.${program.status}`)}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-6">
                <h3 className="font-serif text-xl font-bold leading-snug text-brown-900">
                  {program.title}
                </h3>
                <p className="flex-1 font-serif text-[15px] font-light leading-[1.7] text-brown-400">
                  {program.description}
                </p>
                <p className="flex items-center gap-2 font-serif text-sm text-brown-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  <span>
                    {t("duration")}: {program.duration}
                  </span>
                </p>
                <Link
                  href="/programs"
                  className="mt-2 inline-flex items-center gap-2 font-serif text-[15px] font-bold text-brown-500 transition-colors hover:text-red-600"
                >
                  {t("cardCta")}
                  <ArrowIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:rtl:-translate-x-0.5" />
                </Link>
              </div>
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
