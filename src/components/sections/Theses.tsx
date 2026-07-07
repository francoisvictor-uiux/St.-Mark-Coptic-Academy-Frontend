import { useTranslations, useMessages } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import PillButton from "@/components/ui/PillButton";
import Reveal from "@/components/ui/Reveal";

type ThesisItem = {
  title: string;
  researcher: string;
  degree: string;
  institution: string;
  year: string;
};

export default function Theses() {
  const t = useTranslations("theses");
  const messages = useMessages() as {
    theses: { items: ThesisItem[] };
  };
  const theses = messages.theses.items;

  return (
    <section id="theses" aria-labelledby="theses-label" className="bg-creamy-100 py-8 md:py-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        {/* Dark editorial band, echoing the vision card surface */}
        <Reveal className="rounded-card bg-brown-500 px-6 py-14 md:px-14 md:py-20">
          <div className="mx-auto flex max-w-[1248px] flex-col gap-10 md:gap-14 [&_h2]:text-red-300 [&_p]:text-creamy-100/70">
            <SectionHeader label={t("label")} subtitle={t("subtitle")} />
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
                    <dt className="text-creamy-100/50">{t("researcher")}:</dt>
                    <dd>{thesis.researcher}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dd>{thesis.institution}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-creamy-100/50">{t("year")}:</dt>
                    <dd dir="ltr">{thesis.year}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 md:mt-14" data-reveal>
            <PillButton href="/theses" variant="light" withArrow>
              {t("showAll")}
            </PillButton>
            <p className="font-serif text-sm font-light text-creamy-100/60">{t("showAllHint")}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
