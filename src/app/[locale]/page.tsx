import { setRequestLocale } from "next-intl/server";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Partners from "@/components/sections/Partners";
import Vision from "@/components/sections/Vision";
import Programs from "@/components/sections/Programs";
import Theses from "@/components/sections/Theses";
import Features from "@/components/sections/Features";
import Articles from "@/components/sections/Articles";
import Testimonials from "@/components/sections/Testimonials";
import Gallery from "@/components/sections/Gallery";
import Events from "@/components/sections/Events";
import ApplyForm from "@/components/sections/ApplyForm";
import Faq from "@/components/sections/Faq";
import {
  getHomeData,
  getPublicFaqs,
  getPublishedArticles,
  getPublishedEvents,
  mapHome,
  toSectionArticles,
  toSectionEvents,
  toSectionFaqs,
} from "@/lib/public-content";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Real CMS content; every section falls back to designed placeholders while empty.
  const [articles, events, faqs, home] = await Promise.all([
    getPublishedArticles(),
    getPublishedEvents("upcoming"),
    getPublicFaqs(),
    getHomeData(),
  ]);
  const cms = mapHome(home, locale);
  const show = cms.visibility;

  return (
    <>
      <Header />
      <main>
        {show.hero ? <Hero overrides={cms.hero} /> : null}
        {show.partners ? <Partners items={cms.partners.items} label={cms.partners.label} /> : null}
        {show.vision ? <Vision data={cms.vision} showStats={show.stats} /> : null}
        {show.programs ? <Programs items={cms.programs.items} labels={cms.programs.labels} /> : null}
        {show.theses ? <Theses items={cms.theses.items} labels={cms.theses.labels} /> : null}
        {show.features ? <Features items={cms.features.items} labels={cms.features.labels} /> : null}
        {show.articles ? <Articles items={toSectionArticles(articles, locale)} /> : null}
        {show.testimonials ? <Testimonials items={cms.testimonials.items} labels={cms.testimonials.labels} /> : null}
        {show.gallery ? <Gallery images={cms.gallery.images} labels={cms.gallery.labels} /> : null}
        {show.events ? <Events items={toSectionEvents(events, locale)} /> : null}
        {show.apply ? <ApplyForm labels={cms.apply.labels} programOptions={cms.apply.programOptions} /> : null}
        {show.faq ? <Faq items={toSectionFaqs(faqs, locale)} /> : null}
      </main>
      <Footer />
    </>
  );
}
