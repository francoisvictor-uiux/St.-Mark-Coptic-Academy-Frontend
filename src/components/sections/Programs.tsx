import { useTranslations, useMessages } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import PillButton from "@/components/ui/PillButton";
import Reveal from "@/components/ui/Reveal";
import ProgramCard, { type ProgramItem } from "@/components/sections/ProgramCard";

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

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {programs.slice(0, 3).map((program) => (
            <ProgramCard key={program.id} program={program} />
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
