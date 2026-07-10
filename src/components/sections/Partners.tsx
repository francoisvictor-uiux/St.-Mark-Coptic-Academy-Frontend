import Image from "next/image";
import { useTranslations } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import Reveal from "@/components/ui/Reveal";

type PartnerLogo = { src: string; name: string; w?: number };

const PARTNERS: PartnerLogo[] = [
  { src: "/partners/partner-1.png", name: "Institute of Coptic Studies", w: 328 },
  { src: "/partners/partner-2.jpg", name: "Clerical College", w: 280 },
  { src: "/partners/partner-3.png", name: "Tanta University", w: 210 },
  { src: "/partners/partner-4.png", name: "Clerical College of Alexandria", w: 210 },
  { src: "/partners/partner-5.png", name: "Coptic Orthodox Theological College", w: 350 },
];

function LogoRow({ logos }: { logos: PartnerLogo[] }) {
  return (
    <>
      {logos.map((p) => (
        <div key={p.src} className="group relative flex shrink-0 items-center">
          <Image
            src={p.src}
            alt={p.name}
            width={p.w ?? 280}
            height={112}
            style={{ width: "auto", height: "auto" }}
            className="h-20 max-h-20 w-auto shrink-0 object-contain opacity-90 grayscale mix-blend-multiply transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0 md:h-28 md:max-h-28"
          />
          {/* Name reveals on hover of the individual logo (band pauses on hover). */}
          <span
            role="tooltip"
            className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-ink-900/95 px-3 py-1.5 text-xs font-medium text-creamy-50 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
          >
            {p.name}
          </span>
        </div>
      ))}
    </>
  );
}

/** Marquee half — rendered twice inside a track for a seamless loop. */
function MarqueeRow({ logos, reverse = false }: { logos: PartnerLogo[]; reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div
        className={`flex w-max items-center gap-14 pe-14 md:gap-[60px] md:pe-[60px] ${
          reverse ? "marquee-track-reverse" : "marquee-track"
        }`}
        style={{ "--marquee-duration": "36s" } as React.CSSProperties}
      >
        <LogoRow logos={logos} />
        <LogoRow logos={logos} />
        <LogoRow logos={logos} />
        <LogoRow logos={logos} />
      </div>
    </div>
  );
}

export default function Partners({ items, label }: { items?: PartnerLogo[]; label?: string }) {
  const t = useTranslations("partners");
  const logos = items && items.length > 0 ? items : PARTNERS;

  return (
    <section aria-label={label || t("label")} className="bg-creamy-100 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-[1248px] flex-col gap-10 px-4 md:gap-14 md:px-8">
        <SectionHeader label={label || t("label")} />
        <div className="marquee-paused flex flex-col opacity-70" data-reveal dir="ltr">
          <MarqueeRow logos={logos} />
        </div>
      </Reveal>
    </section>
  );
}
