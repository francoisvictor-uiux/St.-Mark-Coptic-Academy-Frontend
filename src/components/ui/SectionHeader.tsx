import CopticCross from "./CopticCross";

type SectionHeaderProps = {
  label: string;
  subtitle?: string;
};

/**
 * Universal section header from the Figma design language:
 * centered red label + 24px Coptic cross, optional muted subtitle below.
 */
export default function SectionHeader({ label, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2" data-reveal>
        <h2 className="font-serif text-[26px] leading-tight text-red-500 md:text-[32px]">
          {label}
        </h2>
        <CopticCross className="size-6 shrink-0 text-red-500" />
      </div>
      {subtitle ? (
        <p
          className="font-serif text-lg text-muted md:text-2xl md:leading-tight"
          data-reveal
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
