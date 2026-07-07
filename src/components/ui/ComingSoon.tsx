import { useTranslations } from "next-intl";
import CopticCross from "@/components/ui/CopticCross";
import PillButton from "@/components/ui/PillButton";

type ComingSoonProps = {
  title: string;
};

/** Placeholder shell for catalog pages (programs, theses, articles, events) until the full platform ships. */
export default function ComingSoon({ title }: ComingSoonProps) {
  const t = useTranslations("misc");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-creamy-100 px-4 py-24 text-center">
      <span className="flex size-[90px] items-center justify-center rounded-full bg-red-500">
        <CopticCross className="size-11 text-creamy-100" />
      </span>
      <div className="flex flex-col gap-3">
        <p className="font-serif text-lg text-red-500">{t("comingSoonTitle")}</p>
        <h1 className="font-serif text-3xl font-bold text-brown-900 md:text-5xl">{title}</h1>
        <p className="mx-auto max-w-md font-serif text-[16px] font-light leading-[1.8] text-brown-400">
          {t("comingSoonBody")}
        </p>
      </div>
      <PillButton href="/" variant="outline">
        {t("backHome")}
      </PillButton>
    </main>
  );
}
