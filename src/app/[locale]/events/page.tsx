import { setRequestLocale, getTranslations } from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SectionHeader from "@/components/ui/SectionHeader";
import { getPublishedEvents, pickLang } from "@/lib/public-content";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-50 text-red-800",
  online: "bg-blue-50 text-blue-500",
  full: "bg-ink-50 text-ink-400",
};

function EventRow({
  event,
  locale,
  timeLabel,
  statusLabel,
  typeLabel,
}: {
  event: Awaited<ReturnType<typeof getPublishedEvents>>[number];
  locale: string;
  timeLabel: string;
  statusLabel: string;
  typeLabel: string;
}) {
  const starts = new Date(event.starts_at);
  const arabic = locale === "ar";
  const month = new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-GB", { month: "long" }).format(starts);

  return (
    <article className="flex flex-col gap-5 border-b border-line py-7 md:flex-row md:items-center md:gap-8">
      <div className="flex shrink-0 items-center gap-4 md:w-32 md:flex-col md:gap-0 md:text-center">
        <span className="font-archivo text-5xl font-light text-brown-900 md:text-6xl" dir="ltr">
          {starts.getUTCDate()}
        </span>
        <span className="font-serif text-[15px] text-brown-400">
          {month} {starts.getUTCFullYear()}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-xl font-bold text-brown-900 md:text-2xl">
            {pickLang(locale, event.title_ar, event.title_en)}
          </h2>
          <span className={`rounded-full px-3.5 py-1 font-serif text-[13px] font-bold ${STATUS_STYLES[event.capacity_status]}`}>
            {statusLabel}
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-serif text-[15px] font-light text-brown-400">
          <span>{typeLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{timeLabel}</span>
          {event.location_ar || event.location_en ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{pickLang(locale, event.location_ar, event.location_en)}</span>
            </>
          ) : null}
        </p>
        {event.description_ar || event.description_en ? (
          <p className="max-w-2xl font-serif text-[15px] font-light leading-[1.8] text-brown-400">
            {pickLang(locale, event.description_ar, event.description_en)}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("events");
  const [upcoming, past] = await Promise.all([
    getPublishedEvents("upcoming"),
    getPublishedEvents("past"),
  ]);

  const timeOf = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 py-24 md:px-8 md:py-32">
        <SectionHeader label={t("label")} subtitle={t("subtitle")} />

        {upcoming.length === 0 && past.length === 0 ? (
          <p className="mt-16 text-center font-serif text-lg font-light text-brown-400">
            {t("emptyState")}
          </p>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <div className="mt-14 flex flex-col">
                {upcoming.map((event) => (
                  <EventRow
                    key={event.slug}
                    event={event}
                    locale={locale}
                    timeLabel={timeOf(event.starts_at)}
                    statusLabel={t(`status.${event.capacity_status}`)}
                    typeLabel={t(`filters.${event.event_type}`)}
                  />
                ))}
              </div>
            ) : null}

            {past.length > 0 ? (
              <>
                <h2 className="mt-16 text-center font-serif text-[22px] font-bold text-brown-400">
                  {t("pastTitle")}
                </h2>
                <div className="mt-6 flex flex-col opacity-70">
                  {past.slice(0, 6).map((event) => (
                    <EventRow
                      key={event.slug}
                      event={event}
                      locale={locale}
                      timeLabel={timeOf(event.starts_at)}
                      statusLabel={t(`status.${event.capacity_status}`)}
                      typeLabel={t(`filters.${event.event_type}`)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
